/**
 * 系统配置路由 - API 配置从 .env 读取（只读）
 */
const express = require('express');
const { getPublicSettings } = require('../config/env');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

/**
 * GET /api/settings - 获取系统配置（来自 .env，只读）
 */
router.get('/', (req, res) => {
  res.json({ success: true, data: getPublicSettings() });
});

module.exports = router;
