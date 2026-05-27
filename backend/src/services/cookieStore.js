/**
 * 账号持久化浏览器配置（Chrome User Data 目录，登录态长期保存）
 */
const fs = require('fs');
const path = require('path');
const { getChromiumExecutablePath } = require('../config/playwrightEnv');
const { PROFILES_DIR, STORAGE_ROOT } = require('../config/paths');

const PENDING_DIR = path.join(PROFILES_DIR, '_pending');

const DEFAULT_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const LAUNCH_ARGS = ['--no-sandbox', '--disable-setuid-sandbox'];

function ensureProfilesDir() {
  fs.mkdirSync(PROFILES_DIR, { recursive: true });
  fs.mkdirSync(PENDING_DIR, { recursive: true });
}

function getProfileDir(accountId) {
  return path.join(PROFILES_DIR, accountId);
}

function getPendingDir(sessionId) {
  return path.join(PENDING_DIR, sessionId);
}

function getRelativeProfileDir(accountId) {
  return `profiles/${accountId}`;
}

function resolveProfileDir(account) {
  if (!account?.id && !account?.profilePath) return null;

  if (account.profilePath) {
    const abs = path.join(STORAGE_ROOT, account.profilePath);
    if (fs.existsSync(abs)) {
      return fs.statSync(abs).isDirectory() ? abs : null;
    }
  }

  const dir = getProfileDir(account.id);
  if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
    return dir;
  }

  // 兼容旧版 storageState 单文件
  const legacy = path.join(PROFILES_DIR, `${account.id}.json`);
  return fs.existsSync(legacy) ? legacy : null;
}

function hasProfileDir(account) {
  const resolved = resolveProfileDir(account);
  if (!resolved) return false;
  return fs.statSync(resolved).isDirectory();
}

function promotePendingProfile(sessionId, accountId) {
  ensureProfilesDir();
  const pending = getPendingDir(sessionId);
  const target = getProfileDir(accountId);
  if (!fs.existsSync(pending)) return getRelativeProfileDir(accountId);
  if (fs.existsSync(target)) {
    fs.rmSync(target, { recursive: true, force: true });
  }
  fs.renameSync(pending, target);
  return getRelativeProfileDir(accountId);
}

function removeProfile(accountId) {
  const dir = getProfileDir(accountId);
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  const legacy = path.join(PROFILES_DIR, `${accountId}.json`);
  if (fs.existsSync(legacy)) fs.unlinkSync(legacy);
  const pending = getPendingDir(accountId);
  if (fs.existsSync(pending)) {
    fs.rmSync(pending, { recursive: true, force: true });
  }
}

function cookiesToString(cookies) {
  return cookies.map((c) => `${c.name}=${c.value}`).join('; ');
}

async function syncCookiesFromContext(context) {
  const cookies = await context.cookies();
  return cookiesToString(cookies);
}

function getLaunchOptions(headless = true) {
  return {
    headless,
    args: LAUNCH_ARGS,
    userAgent: DEFAULT_UA,
    viewport: { width: 1280, height: 900 },
    locale: 'zh-CN',
  };
}

/**
 * 启动持久化浏览器上下文（Cookie 自动写入磁盘，长期有效）
 */
async function launchPersistentContext(playwright, userDataDir, headless = true) {
  const executablePath = getChromiumExecutablePath();
  if (!executablePath) {
    throw new Error(
      '未找到 Playwright Chromium。请在终端执行：\n' +
        '  cd backend && npx playwright install chromium\n' +
        '然后重启后端。'
    );
  }

  ensureProfilesDir();
  fs.mkdirSync(userDataDir, { recursive: true });

  const legacyJson = `${userDataDir}.json`;
  const options = { ...getLaunchOptions(headless), executablePath };

  if (!fs.existsSync(path.join(userDataDir, 'Default')) && fs.existsSync(legacyJson)) {
    options.storageState = legacyJson;
  }

  return playwright.chromium.launchPersistentContext(userDataDir, options);
}

module.exports = {
  PROFILES_DIR,
  PENDING_DIR,
  DEFAULT_UA,
  ensureProfilesDir,
  getProfileDir,
  getPendingDir,
  getRelativeProfileDir,
  resolveProfileDir,
  hasProfileDir,
  promotePendingProfile,
  removeProfile,
  cookiesToString,
  syncCookiesFromContext,
  launchPersistentContext,
};
