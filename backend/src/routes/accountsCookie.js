/**
 * 浏览器窗口登录路由 - 持久化登录态
 */
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { authMiddleware } = require('../middleware/auth');
const { getDb, saveDb } = require('../services/db');
const { encrypt } = require('../services/crypto');
const {
  getRelativeProfileDir,
  promotePendingProfile,
} = require('../services/cookieStore');
const { keepAccountAlive } = require('../services/accountKeepAlive');
const {
  startBrowserLogin,
  getSessionStatus,
  getSessionCookie,
  cleanupSession,
} = require('../services/cookieLogin');

const router = express.Router();
router.use(authMiddleware);

router.post('/start', async (req, res) => {
  try {
    const { accountId } = req.body || {};
    const data = await startBrowserLogin({ accountId });
    res.json({
      success: true,
      data,
      message: accountId ? '已打开浏览器，请重新登录以刷新永久登录态' : '已打开浏览器，请在新窗口中登录小红书',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:sessionId/status', (req, res) => {
  const status = getSessionStatus(req.params.sessionId);
  if (!status) {
    return res.status(404).json({ success: false, message: '登录会话不存在或已过期' });
  }
  res.json({ success: true, data: status });
});

router.post('/:sessionId/confirm', async (req, res) => {
  try {
    const { name, remark, accountId: refreshAccountId } = req.body;
    const sessionId = req.params.sessionId;
    const { cookie, nickname, sessionId: sid, accountId: sessionAccountId } =
      getSessionCookie(sessionId);

    const db = getDb();
    const targetAccountId = refreshAccountId || sessionAccountId;

    if (targetAccountId) {
      const account = db.data.accounts.find((a) => a.id === targetAccountId);
      if (!account) {
        return res.status(404).json({ success: false, message: '账号不存在' });
      }
      account.cookie = encrypt(cookie);
      account.authType = 'cookie';
      account.loginType = 'browser';
      account.profilePath = getRelativeProfileDir(targetAccountId);
      account.updatedAt = new Date().toISOString();
      account.lastKeepAlive = new Date().toISOString();
      if (name) account.name = name;
      if (remark !== undefined) account.remark = remark;
      await saveDb();
      cleanupSession(sessionId);
      const { cookie: _, password: __, ...safeAccount } = account;
      return res.json({
        success: true,
        data: safeAccount,
        message: `账号「${account.name}」永久登录态已更新`,
      });
    }

    const newId = uuidv4();
    promotePendingProfile(sid, newId);
    const accountName = name || nickname || `小红书账号_${Date.now().toString().slice(-4)}`;

    const account = {
      id: newId,
      name: accountName,
      authType: 'cookie',
      loginType: 'browser',
      cookie: encrypt(cookie),
      profilePath: getRelativeProfileDir(newId),
      username: '',
      password: '',
      remark: remark || (nickname ? `浏览器登录 · ${nickname}` : '浏览器登录'),
      enabled: true,
      lastKeepAlive: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.data.accounts.push(account);
    await saveDb();
    cleanupSession(sessionId);

    const { cookie: _c, password: _p, ...safeAccount } = account;
    res.json({
      success: true,
      data: safeAccount,
      message: `账号「${accountName}」已添加，登录态已永久保存`,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/** 手动触发单个账号保活 */
router.post('/keepalive/:accountId', async (req, res) => {
  try {
    const db = getDb();
    const account = db.data.accounts.find((a) => a.id === req.params.accountId);
    if (!account) {
      return res.status(404).json({ success: false, message: '账号不存在' });
    }
    const result = await keepAccountAlive(account);
    res.json({ success: result.ok, message: result.message });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/:sessionId', (req, res) => {
  cleanupSession(req.params.sessionId);
  res.json({ success: true, message: '已取消' });
});

module.exports = router;
