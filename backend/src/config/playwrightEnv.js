/**
 * 固定 Playwright Chromium 路径，避免沙箱/临时目录导致找不到浏览器
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

function getDefaultBrowsersPath() {
  if (process.platform === 'darwin') {
    return path.join(os.homedir(), 'Library/Caches/ms-playwright');
  }
  if (process.platform === 'win32') {
    return path.join(os.homedir(), 'AppData', 'Local', 'ms-playwright');
  }
  return path.join(os.homedir(), '.cache', 'ms-playwright');
}

function findChromiumExecutable(browsersPath) {
  if (!browsersPath || !fs.existsSync(browsersPath)) return null;

  let entries;
  try {
    entries = fs.readdirSync(browsersPath);
  } catch {
    return null;
  }

  const chromiumDir = entries.find((e) => /^chromium-\d+/.test(e));
  if (!chromiumDir) return null;

  const base = path.join(browsersPath, chromiumDir);
  const candidates = [
    path.join(
      base,
      'chrome-mac-arm64',
      'Google Chrome for Testing.app',
      'Contents',
      'MacOS',
      'Google Chrome for Testing'
    ),
    path.join(base, 'chrome-linux', 'chrome'),
    path.join(base, 'chrome-win', 'chrome.exe'),
  ];

  return candidates.find((p) => fs.existsSync(p)) || null;
}

let cachedExecutable = null;
let cachedBrowsersPath = null;

function setupPlaywrightEnv() {
  const homePath = getDefaultBrowsersPath();
  const fromEnv = process.env.PLAYWRIGHT_BROWSERS_PATH
    ? path.resolve(process.env.PLAYWRIGHT_BROWSERS_PATH)
    : null;

  const candidates = [...new Set([fromEnv, homePath].filter(Boolean))];

  for (const browsersPath of candidates) {
    const exe = findChromiumExecutable(browsersPath);
    if (exe) {
      process.env.PLAYWRIGHT_BROWSERS_PATH = browsersPath;
      cachedBrowsersPath = browsersPath;
      cachedExecutable = exe;
      return { ok: true, browsersPath, executablePath: exe };
    }
  }

  cachedExecutable = null;
  cachedBrowsersPath = null;
  return { ok: false, browsersPath: homePath, executablePath: null };
}

function getChromiumExecutablePath() {
  if (!cachedExecutable) setupPlaywrightEnv();
  return cachedExecutable;
}

function getPlaywrightStatus() {
  const setup = setupPlaywrightEnv();
  return {
    configured: setup.ok,
    browsersPath: cachedBrowsersPath || setup.browsersPath,
    executablePath: cachedExecutable,
    installHint: 'cd backend && npx playwright install chromium',
  };
}

module.exports = {
  setupPlaywrightEnv,
  getChromiumExecutablePath,
  getPlaywrightStatus,
};
