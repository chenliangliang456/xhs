/**
 * 浏览器窗口登录 - 持久化 Chrome 配置，登录态长期保存
 */
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const {
  cookiesToString,
  getProfileDir,
  getPendingDir,
  launchPersistentContext,
} = require('./cookieStore');

const SESSION_TTL = 600000; // 10 分钟
const POLL_INTERVAL = 2000;
const LOGIN_URL = 'https://creator.xiaohongshu.com/login';

/** @type {Map<string, object>} */
const sessions = new Map();

function getPlaywright() {
  try {
    return require('playwright');
  } catch {
    throw new Error('需要 Playwright，请执行：cd backend && npx playwright install chromium');
  }
}

async function checkLoginStatus(session) {
  if (session.status === 'success' || session.status === 'expired') return;

  const cookies = await session.context.cookies();
  const hasSession = cookies.some(
    (c) =>
      c.name === 'web_session' ||
      c.name === 'webSession' ||
      c.name === 'customer-sso-sid' ||
      c.name === 'a1'
  );

  const currentUrl = session.page.url();
  const loggedIn =
    hasSession ||
    (currentUrl.includes('creator.xiaohongshu.com') && !currentUrl.includes('/login'));

  if (loggedIn) {
    session.status = 'success';
    session.message = '登录成功，已永久保存到本地浏览器配置';
    session.cookie = cookiesToString(cookies);

    try {
      const nickname = await session.page
        .locator('.user-name, .nickname, [class*="userName"], [class*="nick"]')
        .first()
        .textContent({ timeout: 3000 });
      session.nickname = nickname?.trim() || null;
    } catch {
      session.nickname = null;
    }

    logger.info(`浏览器登录成功 [${session.id}]`);
    stopPolling(session);
  }
}

function startPolling(session) {
  session.pollTimer = setInterval(async () => {
    try {
      await checkLoginStatus(session);
    } catch (error) {
      logger.error(`浏览器登录轮询异常 [${session.id}]:`, error.message);
    }
  }, POLL_INTERVAL);
}

function stopPolling(session) {
  if (session.pollTimer) {
    clearInterval(session.pollTimer);
    session.pollTimer = null;
  }
}

/**
 * @param {{ accountId?: string }} options - 传 accountId 则为刷新已有账号
 */
async function startBrowserLogin(options = {}) {
  const playwright = getPlaywright();
  const sessionId = uuidv4();
  const { accountId } = options;

  const userDataDir = accountId ? getProfileDir(accountId) : getPendingDir(sessionId);

  const context = await launchPersistentContext(playwright, userDataDir, false);
  const page = context.pages()[0] || (await context.newPage());

  try {
    await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });

    const session = {
      id: sessionId,
      accountId: accountId || null,
      status: 'waiting',
      message: '请在弹出的浏览器窗口中登录（登录态将永久保存在本机）',
      context,
      page,
      userDataDir,
      cookie: null,
      nickname: null,
      createdAt: Date.now(),
      pollTimer: null,
    };

    sessions.set(sessionId, session);
    startPolling(session);

    setTimeout(() => {
      if (sessions.has(sessionId) && sessions.get(sessionId).status !== 'success') {
        const s = sessions.get(sessionId);
        s.status = 'expired';
        s.message = '登录超时，请重试';
        cleanupSession(sessionId, 3000);
      }
    }, SESSION_TTL);

    logger.info(`浏览器登录会话已创建: ${sessionId}${accountId ? ` (刷新 ${accountId})` : ''}`);

    return {
      sessionId,
      expiresIn: SESSION_TTL / 1000,
      message: session.message,
    };
  } catch (error) {
    await context.close().catch(() => {});
    throw new Error(`打开登录浏览器失败: ${error.message}`);
  }
}

function getSessionStatus(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) return null;

  return {
    sessionId: session.id,
    status: session.status,
    message: session.message,
    nickname: session.nickname,
    hasCookie: !!session.cookie,
  };
}

function getSessionCookie(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) {
    throw new Error('登录会话不存在或已过期');
  }
  if (session.status !== 'success' || !session.cookie) {
    throw new Error('请先在弹出的浏览器中完成登录');
  }
  return {
    cookie: session.cookie,
    nickname: session.nickname,
    sessionId: session.id,
    accountId: session.accountId,
    userDataDir: session.userDataDir,
  };
}

function cleanupSession(sessionId, delay = 0) {
  const doCleanup = () => {
    const session = sessions.get(sessionId);
    if (!session) return;
    stopPolling(session);
    session.context?.close().catch(() => {});
    sessions.delete(sessionId);
    logger.info(`浏览器登录会话已清理: ${sessionId}`);
  };

  if (delay > 0) {
    setTimeout(doCleanup, delay);
  } else {
    doCleanup();
  }
}

module.exports = {
  startBrowserLogin,
  getSessionStatus,
  getSessionCookie,
  cleanupSession,
};
