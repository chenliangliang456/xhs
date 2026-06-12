/**
 * GET /api/settings - 获取系统配置（掩码展示）
 * PUT /api/settings/api-keys - 保存 API 密钥（设置页）
 */
const express = require('express');
const { getPublicSettings, saveApiSettings } = require('../services/settingsStore');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

router.get('/', (req, res) => {
  res.json({ success: true, data: getPublicSettings() });
});

router.put('/api-keys', async (req, res) => {
  try {
    const data = await saveApiSettings(req.body || {});
    res.json({ success: true, data, message: 'API 配置已保存并生效' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || '保存失败' });
  }
});

module.exports = router;
