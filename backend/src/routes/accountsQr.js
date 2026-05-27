/**
 * 小红书扫码登录路由
 */
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { authMiddleware } = require('../middleware/auth');
const { getDb, saveDb } = require('../services/db');
const { encrypt } = require('../services/crypto');
const {
  startQrLogin,
  getSessionStatus,
  getSessionCookie,
  cleanupSession,
} = require('../services/qrLogin');

const router = express.Router();
router.use(authMiddleware);

/**
 * POST /api/accounts/qr/start - 发起扫码登录，返回二维码
 */
router.post('/start', async (req, res) => {
  try {
    const data = await startQrLogin();
    res.json({ success: true, data, message: '请使用小红书 App 扫描二维码' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/accounts/qr/:sessionId/status - 轮询扫码状态
 */
router.get('/:sessionId/status', (req, res) => {
  const status = getSessionStatus(req.params.sessionId);
  if (!status) {
    return res.status(404).json({ success: false, message: '扫码会话不存在或已过期' });
  }
  res.json({ success: true, data: status });
});

/**
 * POST /api/accounts/qr/:sessionId/confirm - 确认登录并保存账号
 */
router.post('/:sessionId/confirm', async (req, res) => {
  try {
    const { name, remark } = req.body;
    const sessionId = req.params.sessionId;

    const { cookie, nickname } = getSessionCookie(sessionId);

    const accountName = name || nickname || `小红书账号_${Date.now().toString().slice(-4)}`;

    const db = getDb();
    const account = {
      id: uuidv4(),
      name: accountName,
      authType: 'cookie',
      loginType: 'qrcode',
      cookie: encrypt(cookie),
      username: '',
      password: '',
      remark: remark || (nickname ? `扫码登录 · ${nickname}` : '扫码登录'),
      enabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.data.accounts.push(account);
    await saveDb();
    cleanupSession(sessionId);

    const { cookie: _, password: __, ...safeAccount } = account;
    res.json({
      success: true,
      data: safeAccount,
      message: `账号「${accountName}」添加成功`,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * DELETE /api/accounts/qr/:sessionId - 取消扫码
 */
router.delete('/:sessionId', (req, res) => {
  cleanupSession(req.params.sessionId);
  res.json({ success: true, message: '已取消扫码登录' });
});

module.exports = router;
