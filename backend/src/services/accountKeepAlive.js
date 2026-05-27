/**
 * 账号登录态保活 + 同步 Cookie 到数据库
 */
const { getDb, saveDb } = require('./db');
const { encrypt } = require('./crypto');
const {
  resolveProfileDir,
  syncCookiesFromContext,
  launchPersistentContext,
  getProfileDir,
} = require('./cookieStore');
const logger = require('../utils/logger');

const CREATOR_HOME = 'https://creator.xiaohongshu.com/';

function getPlaywright() {
  return require('playwright');
}

async function isLoggedIn(page) {
  if (page.url().includes('/login')) return false;
  const body = await page.locator('body').innerText().catch(() => '');
  return !body.includes('短信登录') || page.url().includes('/home');
}

/**
 * 访问创作者首页，刷新并持久化 Cookie
 */
async function keepAccountAlive(account, { headless = true } = {}) {
  const profileDir = resolveProfileDir(account);
  if (!profileDir || !require('fs').statSync(profileDir).isDirectory()) {
    return { ok: false, message: '无持久化配置，请刷新登录' };
  }

  const playwright = getPlaywright();
  let context;

  try {
    context = await launchPersistentContext(playwright, profileDir, headless);
    const page = context.pages()[0] || (await context.newPage());

    await page.goto(CREATOR_HOME, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(2000);

    if (!(await isLoggedIn(page))) {
      return { ok: false, message: '登录已失效，请刷新登录' };
    }

    const cookieStr = await syncCookiesFromContext(context);
    const db = getDb();
    const acc = db.data.accounts.find((a) => a.id === account.id);
    if (acc && cookieStr) {
      acc.cookie = encrypt(cookieStr);
      acc.profilePath = acc.profilePath || `profiles/${account.id}`;
      acc.lastKeepAlive = new Date().toISOString();
      acc.updatedAt = new Date().toISOString();
      await saveDb();
    }

    logger.info(`[保活] 账号 ${account.name} 登录态已刷新`);
    return { ok: true, message: '登录态已刷新' };
  } catch (error) {
    logger.error(`[保活] 账号 ${account.name} 失败:`, error.message);
    return { ok: false, message: error.message };
  } finally {
    await context?.close().catch(() => {});
  }
}

/** 发布前预热登录态 */
async function warmupBeforePublish(account) {
  return keepAccountAlive(account, { headless: true });
}

/** 启动定时保活 */
function startKeepAliveScheduler() {
  const intervalMs = Number(process.env.XHS_KEEPALIVE_INTERVAL) || 6 * 60 * 60 * 1000; // 6 小时

  const run = async () => {
    try {
      const db = getDb();
      const accounts = db.data.accounts.filter(
        (a) => a.enabled && a.authType === 'cookie' && getProfileDir(a.id)
      );
      if (accounts.length === 0) return;

      logger.info(`[保活] 开始刷新 ${accounts.length} 个账号登录态...`);
      for (const account of accounts) {
        await keepAccountAlive(account);
        await new Promise((r) => setTimeout(r, 3000));
      }
    } catch (error) {
      logger.error('[保活] 定时任务异常:', error.message);
    }
  };

  setTimeout(run, 15000);
  setInterval(run, intervalMs);
  logger.info(`[保活] 已启动，每 ${Math.round(intervalMs / 3600000)} 小时自动刷新登录态`);
}

module.exports = {
  keepAccountAlive,
  warmupBeforePublish,
  startKeepAliveScheduler,
};
