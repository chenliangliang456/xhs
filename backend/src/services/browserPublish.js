/**
 * 小红书浏览器自动化发布（创作者平台）
 * 无需外部 API，使用账号 Cookie + Playwright 模拟人工发帖
 */
const path = require('path');
const fs = require('fs');
const { decrypt, encrypt } = require('./crypto');
const {
  resolveProfileDir,
  syncCookiesFromContext,
  launchPersistentContext,
} = require('./cookieStore');
const { warmupBeforePublish } = require('./accountKeepAlive');
const { getChromiumExecutablePath } = require('../config/playwrightEnv');
const logger = require('../utils/logger');

const PUBLISH_URL =
  process.env.XHS_CREATOR_PUBLISH_URL ||
  'https://creator.xiaohongshu.com/publish/publish?target=image&from=menu';

const IMAGE_TAB_SELECTORS = [
  'text=上传图文',
  '[class*="tab"]:has-text("上传图文")',
  'div:has-text("上传图文")',
];

const UPLOAD_TRIGGER_SELECTORS = [
  'text=上传图片',
  'text=点击上传',
  'text=拖拽图片',
  '[class*="upload"]:has-text("上传")',
];

const FILE_INPUT_SELECTORS = [
  'input[type="file"][accept*="png"]',
  'input[type="file"][accept*="jpg"]',
  'input[type="file"][accept*="jpeg"]',
  'input[type="file"][accept*="webp"]',
  'input[type="file"][accept*="image"]',
  'input[type="file"]',
];

const TITLE_SELECTORS = [
  'input[placeholder*="填写标题"]',
  'input[placeholder*="标题"]',
  'textarea[placeholder*="标题"]',
  '[placeholder*="智能标题"]',
  '.title-input input',
  'input.d-text',
];

const CONTENT_SELECTORS = [
  '[contenteditable="true"]',
  '.ql-editor',
  'div[role="textbox"]',
  'textarea[placeholder*="正文"]',
  'textarea[placeholder*="描述"]',
  'textarea[placeholder*="添加"]',
];

const PUBLISH_BTN_SELECTORS = [
  'button:has-text("发布")',
  'button:has-text("发 布")',
  '[class*="publish"] button:has-text("发布")',
  'div.submit button',
];

function parseCookieString(cookieStr) {
  if (!cookieStr) return [];
  const parsed = cookieStr
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const eq = part.indexOf('=');
      if (eq <= 0) return null;
      const name = part.slice(0, eq).trim();
      const value = part.slice(eq + 1).trim();
      if (!name) return null;
      return { name, value };
    })
    .filter(Boolean);

  const cookies = [];
  for (const { name, value } of parsed) {
    cookies.push({ name, value, domain: '.xiaohongshu.com', path: '/' });
    cookies.push({ name, value, domain: 'creator.xiaohongshu.com', path: '/' });
  }
  return cookies;
}

function buildFullContent(content, tags) {
  const tagStr = (tags || [])
    .map((t) => String(t).replace(/^#/, ''))
    .filter(Boolean)
    .map((t) => `#${t}`)
    .join(' ');
  return tagStr ? `${content}\n\n${tagStr}`.trim() : content;
}

async function tryFill(page, selectors, value) {
  for (const sel of selectors) {
    try {
      const el = page.locator(sel).first();
      if (await el.isVisible({ timeout: 2000 })) {
        await el.click({ timeout: 3000 });
        await el.fill(value);
        return true;
      }
    } catch {
      // next
    }
  }
  return false;
}

async function tryFillContenteditable(page, selectors, value) {
  for (const sel of selectors) {
    try {
      const el = page.locator(sel).first();
      if (await el.isVisible({ timeout: 2000 })) {
        await el.click({ timeout: 3000 });
        await page.keyboard.press('Meta+A');
        await page.keyboard.press('Backspace');
        await el.fill(value);
        return true;
      }
    } catch {
      // next
    }
  }
  return false;
}

async function tryClick(page, selectors, timeout = 2000) {
  for (const sel of selectors) {
    try {
      const el = page.locator(sel).first();
      if (await el.isVisible({ timeout })) {
        await el.click({ timeout: 3000 });
        return true;
      }
    } catch {
      // next
    }
  }
  return false;
}

/** 进入图文发布页（默认页是视频上传，必须切到图文） */
async function prepareImagePublishPage(page) {
  await page.goto(PUBLISH_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(4000);

  const bodyText = await page.locator('body').innerText().catch(() => '');
  const onImageTab =
    bodyText.includes('上传图片') ||
    bodyText.includes('png') ||
    bodyText.includes('jpeg');

  if (!onImageTab) {
    logger.info('[浏览器发布] 切换到「上传图文」标签');
    await tryClick(page, IMAGE_TAB_SELECTORS, 3000);
    await page.waitForTimeout(2000);
  }

  // 等待图文上传区域出现
  for (let i = 0; i < 15; i++) {
    const hasImageInput = await page
      .locator('input[type="file"][accept*="png"], input[type="file"][accept*="jpg"]')
      .count();
    if (hasImageInput > 0) return;
    await page.waitForTimeout(1000);
  }

  throw new Error('图文发布页未加载完成，请稍后重试或在账号管理刷新登录');
}

async function findImageFileInput(page) {
  const inputs = page.locator('input[type="file"]');
  const count = await inputs.count();

  for (let i = 0; i < count; i++) {
    const input = inputs.nth(i);
    try {
      const accept = ((await input.getAttribute('accept')) || '').toLowerCase();
      const isVideo = /mp4|mov|flv|mkv|mpeg|video/.test(accept);
      const isImage =
        !accept ||
        /png|jpg|jpeg|webp|gif|image/.test(accept);

      if (!isVideo && isImage) {
        await input.waitFor({ state: 'attached', timeout: 5000 });
        return input;
      }
    } catch {
      // next
    }
  }
  return null;
}

async function uploadImages(page, imagePaths) {
  const existing = imagePaths.filter((p) => fs.existsSync(p));
  if (existing.length === 0) {
    throw new Error('图片文件不存在，请重新选择素材或上传图片');
  }

  let input = await findImageFileInput(page);

  if (!input) {
    logger.info('[浏览器发布] 尝试点击上传区域触发文件选择');
    for (const sel of UPLOAD_TRIGGER_SELECTORS) {
      try {
        const [fileChooser] = await Promise.all([
          page.waitForEvent('filechooser', { timeout: 5000 }),
          page.locator(sel).first().click({ timeout: 3000 }),
        ]);
        await fileChooser.setFiles(existing);
        logger.info(`已通过文件选择器上传 ${existing.length} 张图片`);
        await waitImagesUploaded(page, existing.length);
        return;
      } catch {
        // next
      }
    }
    input = await findImageFileInput(page);
  }

  if (!input) {
    const debugDir = path.join(__dirname, '../../logs');
    fs.mkdirSync(debugDir, { recursive: true });
    const shot = path.join(debugDir, `publish-fail-${Date.now()}.png`);
    await page.screenshot({ path: shot, fullPage: true }).catch(() => {});
    logger.error(`[浏览器发布] 上传失败，截图: ${shot}`);
    throw new Error('未找到图片上传控件。请确认账号已登录；或在 .env 设置 XHS_BROWSER_HEADLESS=false 后重试');
  }

  await input.setInputFiles(existing.length === 1 ? existing[0] : existing);
  logger.info(`已上传 ${existing.length} 张图片`);
  await waitImagesUploaded(page, existing.length);
}

/** 等待图片上传/处理完成，进入编辑页 */
async function waitImagesUploaded(page, count) {
  const waitMs = Math.min(8000 + count * 2000, 30000);
  await page.waitForTimeout(waitMs);

  for (let i = 0; i < 20; i++) {
    const body = await page.locator('body').innerText().catch(() => '');
    if (
      body.includes('图片编辑') ||
      body.includes('智能标题') ||
      body.includes('添加正文') ||
      body.includes('/1000')
    ) {
      return;
    }
    await page.waitForTimeout(1000);
  }
}

/** 监听发布 API，获取真实笔记 ID */
function watchPublishApi(page) {
  let resolveApi;
  const apiPromise = new Promise((resolve) => {
    resolveApi = resolve;
  });

  const handler = async (response) => {
    if (
      !response.url().includes('/web_api/sns/v2/note') ||
      response.request().method() !== 'POST'
    ) {
      return;
    }
    try {
      const body = await response.json();
      if (body?.success && body?.data?.id) {
        resolveApi({
          noteId: body.data.id,
          shareLink: body.share_link || '',
          url: page.url(),
        });
      }
    } catch {
      // ignore parse errors
    }
  };

  page.on('response', handler);
  return {
    apiPromise,
    cleanup: () => page.off('response', handler),
  };
}

async function clickPublish(page) {
  const customBtn = page.locator('xhs-publish-btn[submit-text="发布"], xhs-publish-btn[is-publish="true"]');
  if (await customBtn.count()) {
    await customBtn.first().scrollIntoViewIfNeeded();
    await page.waitForTimeout(800);
    const box = await customBtn.first().boundingBox();
    if (box) {
      // 左侧「暂存离开」约 0–50%，右侧红色「发布」约 55–95%；0.75 会偏右点空
      await page.mouse.click(box.x + box.width * 0.65, box.y + box.height / 2);
      logger.info('[浏览器发布] 已点击发布按钮');
      return;
    }
    await customBtn.first().click();
    return;
  }

  for (const sel of PUBLISH_BTN_SELECTORS) {
    try {
      const btn = page.locator(sel).first();
      if (await btn.isVisible({ timeout: 2000 })) {
        await btn.click();
        return;
      }
    } catch {
      // next
    }
  }
  throw new Error('未找到「发布」按钮');
}

async function waitPublishResult(page, apiPromise) {
  const timeoutMs = 45000;
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const url = page.url();
    if (url.includes('/publish/success')) {
      const apiResult = await Promise.race([
        apiPromise,
        new Promise((r) => setTimeout(() => r(null), 8000)),
      ]);
      if (apiResult?.noteId) return apiResult;
      throw new Error('已进入发布成功页但未捕获笔记ID，请稍后到创作者中心「笔记管理」确认');
    }

    const apiResult = await Promise.race([
      apiPromise,
      new Promise((r) => setTimeout(() => r(null), 300)),
    ]);
    if (apiResult?.noteId) return apiResult;

    const bodyText = await page.locator('body').innerText().catch(() => '');
    if (/发布成功|笔记发布成功|提交成功|发布完成/.test(bodyText)) {
      const fromApi = await Promise.race([
        apiPromise,
        new Promise((r) => setTimeout(() => r(null), 8000)),
      ]);
      if (fromApi?.noteId) return fromApi;
      throw new Error('页面显示发布成功但未获得笔记ID，请到创作者中心确认是否进入审核');
    }

    await page.waitForTimeout(500);
  }

  throw new Error('发布超时，请到创作者中心「笔记管理」确认是否为草稿或审核中');
}

/**
 * 执行一次完整发布流程
 */
async function runPublishFlow(page, { title, content, tags, imagePaths }) {
  const fullContent = buildFullContent(content, tags);

  await prepareImagePublishPage(page);

  if (page.url().includes('/login')) {
    throw new Error('登录已失效，请在账号管理点「刷新登录」');
  }

  await uploadImages(page, imagePaths);

  const titleOk = await tryFill(page, TITLE_SELECTORS, title);
  if (!titleOk) {
    logger.warn('未定位到标题输入框，将标题写入正文');
  }

  const contentToFill = titleOk ? fullContent : `${title}\n\n${fullContent}`;
  const contentOk = await tryFillContenteditable(page, CONTENT_SELECTORS, contentToFill);
  if (!contentOk) {
    const filled = await tryFill(page, CONTENT_SELECTORS, contentToFill);
    if (!filled) {
      throw new Error('未找到正文编辑区域');
    }
  }

  await page.waitForTimeout(1500);

  const { apiPromise, cleanup } = watchPublishApi(page);
  try {
    await clickPublish(page);
    return await waitPublishResult(page, apiPromise);
  } finally {
    cleanup();
  }
}

/**
 * 通过浏览器发布笔记
 */
async function publishViaBrowser(params) {
  const { account, title, content, tags, imagePaths } = params;

  let cookieStr = '';
  if (account.cookie) {
    cookieStr = decrypt(account.cookie);
  }

  const profileDir = resolveProfileDir(account);
  const usePersistent = profileDir && fs.existsSync(profileDir) && fs.statSync(profileDir).isDirectory();

  if (!cookieStr && !usePersistent) {
    throw new Error('该账号未登录，请使用「浏览器登录」添加账号');
  }

  const executablePath = getChromiumExecutablePath();
  if (!executablePath) {
    throw new Error(
      '未找到 Playwright Chromium。请在终端执行：cd backend && npx playwright install chromium'
    );
  }

  let playwright;
  try {
    playwright = require('playwright');
  } catch {
    throw new Error('需要 Playwright，请执行：cd backend && npx playwright install chromium');
  }

  if (usePersistent) {
    await warmupBeforePublish(account);
  }

  let headless = process.env.XHS_BROWSER_HEADLESS !== 'false';
  let context;
  let browser;
  let lastError;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      if (usePersistent) {
        context = await launchPersistentContext(playwright, profileDir, headless);
        logger.info(`[浏览器发布] 使用持久化配置: ${profileDir} (headless=${headless})`);
      } else {
        browser = await playwright.chromium.launch({
          headless,
          executablePath,
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });
        context = await browser.newContext({
          userAgent:
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          viewport: { width: 1280, height: 900 },
          locale: 'zh-CN',
        });
        const cookies = parseCookieString(cookieStr);
        if (cookies.length > 0) await context.addCookies(cookies);
      }

      const page = context.pages()[0] || (await context.newPage());
      logger.info(`[浏览器发布] 账号 ${account.name} 开始发布...`);

      const result = await runPublishFlow(page, { title, content, tags, imagePaths });

      if (usePersistent) {
        try {
          const freshCookie = await syncCookiesFromContext(context);
          const { getDb, saveDb } = require('./db');
          const db = getDb();
          const acc = db.data.accounts.find((a) => a.id === account.id);
          if (acc && freshCookie) {
            acc.cookie = encrypt(freshCookie);
            acc.lastKeepAlive = new Date().toISOString();
            acc.updatedAt = new Date().toISOString();
            await saveDb();
          }
        } catch (e) {
          logger.warn(`[浏览器发布] Cookie 同步失败: ${e.message}`);
        }
      }

      logger.info(`[浏览器发布] 账号 ${account.name} 发布完成`);

      await context?.close().catch(() => {});
      await browser?.close().catch(() => {});
      context = null;
      browser = null;

      return {
        success: true,
        noteId: result.noteId,
        message: '发布成功，笔记已进入审核（审核通过后 App 可见）',
        browser: true,
        publishUrl: result.url,
        shareLink: result.shareLink || '',
      };
    } catch (error) {
      lastError = error;
      await context?.close().catch(() => {});
      await browser?.close().catch(() => {});
      context = null;
      browser = null;

      if (attempt === 0 && headless && /上传控件|图文发布页/.test(error.message)) {
        logger.warn('[浏览器发布] 无头模式失败，切换有界面浏览器重试...');
        headless = false;
        continue;
      }
      throw error;
    }
  }

  throw lastError || new Error('发布失败');
}

module.exports = { publishViaBrowser, parseCookieString };
