/**
 * 小红书扫码登录服务
 * 使用 Playwright 打开创作者平台登录页，获取二维码并监听登录状态
 */
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

const SESSION_TTL = 120000; // 二维码有效期 2 分钟
const POLL_INTERVAL = 2000;

/** @type {Map<string, object>} */
const sessions = new Map();

const LOGIN_URL = 'https://creator.xiaohongshu.com/login';

const QR_SELECTORS = [
  'img.qrcode-img',
  'img[class*="qrcode"]',
  'img[class*="Qr"]',
  '.login-qrcode img',
  'img[src*="qr"]',
  'canvas',
];

/**
 * 启动扫码登录，返回 sessionId 和二维码图片
 */
async function startQrLogin() {
  let playwright;
  try {
    playwright = require('playwright');
  } catch {
    throw new Error(
      '扫码登录需要 Playwright，请执行：cd backend && npm install playwright && npx playwright install chromium'
    );
  }

  const sessionId = uuidv4();

  const browser = await playwright.chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 },
    locale: 'zh-CN',
  });

  const page = await context.newPage();

  try {
    await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);

    // 尝试切换到扫码登录 Tab
    const qrTabSelectors = [
      'text=扫码登录',
      'text=二维码登录',
      '[class*="qrcode"]',
    ];
    for (const sel of qrTabSelectors) {
      try {
        const tab = page.locator(sel).first();
        if (await tab.isVisible({ timeout: 1000 })) {
          await tab.click();
          await page.waitForTimeout(1000);
          break;
        }
      } catch {
        // 继续尝试
      }
    }

    const qrCode = await captureQrCode(page);

    const session = {
      id: sessionId,
      status: 'waiting',
      message: '请使用小红书 App 扫描二维码',
      browser,
      context,
      page,
      cookie: null,
      nickname: null,
      qrCode,
      createdAt: Date.now(),
      pollTimer: null,
    };

    sessions.set(sessionId, session);
    startPolling(session);

    // 超时自动清理
    setTimeout(() => {
      if (sessions.has(sessionId) && sessions.get(sessionId).status !== 'success') {
        const s = sessions.get(sessionId);
        s.status = 'expired';
        s.message = '二维码已过期，请重新扫码';
        cleanupSession(sessionId, 5000);
      }
    }, SESSION_TTL);

    logger.info(`扫码登录会话已创建: ${sessionId}`);

    return {
      sessionId,
      qrCode,
      expiresIn: SESSION_TTL / 1000,
    };
  } catch (error) {
    await browser.close().catch(() => {});
    throw new Error(`获取登录二维码失败: ${error.message}`);
  }
}

/**
 * 截取二维码图片
 */
async function captureQrCode(page) {
  for (const selector of QR_SELECTORS) {
    try {
      const el = page.locator(selector).first();
      await el.waitFor({ state: 'visible', timeout: 5000 });
      const buffer = await el.screenshot({ type: 'png' });
      return `data:image/png;base64,${buffer.toString('base64')}`;
    } catch {
      // 尝试下一个选择器
    }
  }

  // 兜底：截取登录区域
  const loginBox = page.locator('.login-container, .login-box, main').first();
  const buffer = await loginBox.screenshot({ type: 'png' });
  return `data:image/png;base64,${buffer.toString('base64')}`;
}

/**
 * 后台轮询登录状态
 */
function startPolling(session) {
  session.pollTimer = setInterval(async () => {
    try {
      await checkLoginStatus(session);
    } catch (error) {
      logger.error(`扫码轮询异常 [${session.id}]:`, error.message);
    }
  }, POLL_INTERVAL);
}

/**
 * 检查是否登录成功
 */
async function checkLoginStatus(session) {
  if (session.status === 'success' || session.status === 'expired') return;

  const cookies = await session.context.cookies();
  const hasSession = cookies.some(
    (c) => c.name === 'web_session' || c.name === 'webSession' || c.name === 'customer-sso-sid'
  );

  const currentUrl = session.page.url();
  const loggedIn =
    hasSession ||
    (currentUrl.includes('creator.xiaohongshu.com') && !currentUrl.includes('/login'));

  if (loggedIn) {
    session.status = 'success';
    session.message = '登录成功';
    session.cookie = cookies.map((c) => `${c.name}=${c.value}`).join('; ');

    // 尝试获取昵称
    try {
      const nickname = await session.page
        .locator('.user-name, .nickname, [class*="userName"]')
        .first()
        .textContent({ timeout: 3000 });
      session.nickname = nickname?.trim() || null;
    } catch {
      session.nickname = null;
    }

    logger.info(`扫码登录成功 [${session.id}]${session.nickname ? `: ${session.nickname}` : ''}`);
    stopPolling(session);
    return;
  }

  // 检测二维码是否过期，尝试刷新
  try {
    const expiredText = session.page.locator('text=已过期, text=刷新').first();
    if (await expiredText.isVisible({ timeout: 500 })) {
      session.status = 'waiting';
      session.message = '二维码已刷新，请重新扫描';
      await expiredText.click().catch(() => {});
      await session.page.waitForTimeout(1500);
      session.qrCode = await captureQrCode(session.page);
    }
  } catch {
    // 未过期
  }
}

function stopPolling(session) {
  if (session.pollTimer) {
    clearInterval(session.pollTimer);
    session.pollTimer = null;
  }
}

/**
 * 获取会话状态
 */
function getSessionStatus(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) {
    return null;
  }

  return {
    sessionId: session.id,
    status: session.status,
    message: session.message,
    qrCode: session.qrCode,
    nickname: session.nickname,
    hasCookie: !!session.cookie,
  };
}

/**
 * 确认登录并返回 Cookie（供保存账号）
 */
function getSessionCookie(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) {
    throw new Error('扫码会话不存在或已过期');
  }
  if (session.status !== 'success' || !session.cookie) {
    throw new Error('尚未完成扫码登录');
  }
  return {
    cookie: session.cookie,
    nickname: session.nickname,
  };
}

/**
 * 取消/清理会话
 */
function cleanupSession(sessionId, delay = 0) {
  const doCleanup = () => {
    const session = sessions.get(sessionId);
    if (!session) return;
    stopPolling(session);
    session.browser?.close().catch(() => {});
    sessions.delete(sessionId);
    logger.info(`扫码会话已清理: ${sessionId}`);
  };

  if (delay > 0) {
    setTimeout(doCleanup, delay);
  } else {
    doCleanup();
  }
}

module.exports = {
  startQrLogin,
  getSessionStatus,
  getSessionCookie,
  cleanupSession,
};
