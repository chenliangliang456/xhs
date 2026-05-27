/**
 * 小红书账号管理路由 - CRUD
 */
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb, saveDb } = require('../services/db');
const { encrypt } = require('../services/crypto');
const { removeProfile } = require('../services/cookieStore');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

/**
 * GET /api/accounts - 获取账号列表
 */
router.get('/', (req, res) => {
  const db = getDb();
  const accounts = db.data.accounts.map(({ cookie, password, ...rest }) => ({
    ...rest,
    hasCookie: !!cookie,
    hasPassword: !!password,
  }));
  res.json({ success: true, data: accounts });
});

/**
 * POST /api/accounts - 新增账号
 */
router.post('/', async (req, res) => {
  try {
    const { name, authType, cookie, username, password, remark } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: '请输入账号名称' });
    }

    if (authType === 'cookie' && !cookie) {
      return res.status(400).json({ success: false, message: '请输入 Cookie' });
    }

    if (authType === 'password' && (!username || !password)) {
      return res.status(400).json({ success: false, message: '请输入账号和密码' });
    }

    const db = getDb();
    const account = {
      id: uuidv4(),
      name,
      authType: authType || 'cookie',
      cookie: cookie ? encrypt(cookie) : '',
      username: username || '',
      password: password ? encrypt(password) : '',
      remark: remark || '',
      enabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.data.accounts.push(account);
    await saveDb();

    const { cookie: _, password: __, ...safeAccount } = account;
    res.json({ success: true, data: safeAccount, message: '账号添加成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PUT /api/accounts/:id - 编辑账号
 */
router.put('/:id', async (req, res) => {
  try {
    const db = getDb();
    const index = db.data.accounts.findIndex((a) => a.id === req.params.id);

    if (index === -1) {
      return res.status(404).json({ success: false, message: '账号不存在' });
    }

    const account = db.data.accounts[index];
    const { name, authType, cookie, username, password, remark, enabled } = req.body;

    if (name) account.name = name;
    if (authType) account.authType = authType;
    if (cookie) account.cookie = encrypt(cookie);
    if (username) account.username = username;
    if (password) account.password = encrypt(password);
    if (remark !== undefined) account.remark = remark;
    if (enabled !== undefined) account.enabled = enabled;
    account.updatedAt = new Date().toISOString();

    await saveDb();

    const { cookie: _, password: __, ...safeAccount } = account;
    res.json({ success: true, data: safeAccount, message: '账号更新成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * DELETE /api/accounts/:id - 删除账号
 */
router.delete('/:id', async (req, res) => {
  try {
    const db = getDb();
    const index = db.data.accounts.findIndex((a) => a.id === req.params.id);

    if (index === -1) {
      return res.status(404).json({ success: false, message: '账号不存在' });
    }

    db.data.accounts.splice(index, 1);
    removeProfile(req.params.id);
    await saveDb();

    res.json({ success: true, message: '账号删除成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PATCH /api/accounts/:id/toggle - 启用/禁用账号
 */
router.patch('/:id/toggle', async (req, res) => {
  try {
    const db = getDb();
    const account = db.data.accounts.find((a) => a.id === req.params.id);

    if (!account) {
      return res.status(404).json({ success: false, message: '账号不存在' });
    }

    account.enabled = !account.enabled;
    account.updatedAt = new Date().toISOString();
    await saveDb();

    res.json({
      success: true,
      data: { enabled: account.enabled },
      message: account.enabled ? '账号已启用' : '账号已禁用',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
