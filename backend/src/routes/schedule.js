/**
 * 定时发布配置与日志
 */
const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const {
  getScheduleStatus,
  updateSchedule,
  resetTodayProgress,
  runScheduledSlot,
  tick,
} = require('../services/scheduleService');
const { getDb } = require('../services/db');

const router = express.Router();
router.use(authMiddleware);

router.get('/', (req, res) => {
  res.json({ success: true, data: getScheduleStatus() });
});

router.put('/', async (req, res) => {
  try {
    const data = await updateSchedule(req.body);
    res.json({ success: true, data, message: '定时发布配置已保存' });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get('/logs', (req, res) => {
  const db = getDb();
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  res.json({
    success: true,
    data: (db.data.scheduleLogs || []).slice(0, limit),
  });
});

/** 立即试发（使用第一个时间点或指定 slot） */
router.post('/run-now', async (req, res) => {
  try {
    const schedule = getScheduleStatus();
    const slot =
      req.body.slot ||
      schedule.times?.[0] ||
      '09:00';
    const result = await runScheduledSlot(slot, { manual: true });
    res.json({
      success: result.success !== false,
      data: result,
      message: result.message || (result.success ? '试发成功' : '试发失败'),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/** 重置今日进度（当前 3 个时间点可重新自动发 #1 #2 #3） */
router.post('/reset-today', async (req, res) => {
  try {
    const data = await resetTodayProgress();
    res.json({
      success: true,
      data,
      message: '已重置今日进度，队列已恢复为 3 个时段',
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/tick', async (req, res) => {
  await tick();
  res.json({ success: true, message: '已触发检查', data: getScheduleStatus() });
});

module.exports = router;
