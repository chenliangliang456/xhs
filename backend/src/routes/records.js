/**
 * 发布记录路由
 */
const express = require('express');
const { getDb } = require('../services/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

/**
 * GET /api/records - 获取发布记录列表
 */
router.get('/', (req, res) => {
  const db = getDb();
  const { page = 1, pageSize = 20 } = req.query;
  const start = (page - 1) * pageSize;
  const records = db.data.records.slice(start, start + Number(pageSize));

  res.json({
    success: true,
    data: {
      list: records,
      total: db.data.records.length,
      page: Number(page),
      pageSize: Number(pageSize),
    },
  });
});

/**
 * GET /api/records/:id - 获取单条记录详情
 */
router.get('/:id', (req, res) => {
  const db = getDb();
  const record = db.data.records.find((r) => r.id === req.params.id);

  if (!record) {
    return res.status(404).json({ success: false, message: '记录不存在' });
  }

  res.json({ success: true, data: record });
});

module.exports = router;
