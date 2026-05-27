/**
 * 认证路由 - 登录/退出/用户信息
 */
const express = require('express');
const bcrypt = require('bcryptjs');
const { getDb } = require('../services/db');
const { generateToken, authMiddleware } = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/auth/login - 管理员登录
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: '请输入用户名和密码' });
    }

    const db = getDb();
    const user = db.data.user;

    if (!user || user.username !== username) {
      return res.status(401).json({ success: false, message: '用户名或密码错误' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ success: false, message: '用户名或密码错误' });
    }

    const token = generateToken({ username: user.username });
    res.json({
      success: true,
      data: { token, username: user.username },
      message: '登录成功',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/auth/profile - 获取当前用户信息
 */
router.get('/profile', authMiddleware, (req, res) => {
  res.json({
    success: true,
    data: { username: req.user.username },
  });
});

/**
 * PUT /api/auth/password - 修改密码
 */
router.put('/password', authMiddleware, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const db = getDb();
    const user = db.data.user;

    const valid = await bcrypt.compare(oldPassword, user.password);
    if (!valid) {
      return res.status(400).json({ success: false, message: '原密码错误' });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await db.write();

    res.json({ success: true, message: '密码修改成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
