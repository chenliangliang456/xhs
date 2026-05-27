/**
 * 发布任务路由
 */
const express = require('express');
const path = require('path');
const { createPublishTask, getTaskStatus, republishFromRecord } = require('../services/publishQueue');
const { authMiddleware } = require('../middleware/auth');
const { resolveImagePaths } = require('../utils/imagePaths');

const router = express.Router();
router.use(authMiddleware);

/**
 * POST /api/publish - 创建多账号发布任务
 */
router.post('/', async (req, res) => {
  try {
    const { title, content, tags, imageFilenames, imageSources, accountIds } = req.body;

    if (!title || !content) {
      return res.status(400).json({ success: false, message: '标题和文案不能为空' });
    }

    if (!accountIds || accountIds.length === 0) {
      return res.status(400).json({ success: false, message: '请选择至少一个发布账号' });
    }

    const sources = imageSources?.length
      ? imageSources
      : (imageFilenames || []).map((f) => ({ source: 'upload', filename: f }));

    const imagePaths = resolveImagePaths(sources);

    const task = await createPublishTask({
      title,
      content,
      tags: tags || [],
      imagePaths,
      accountIds,
    });

    res.json({
      success: true,
      data: { taskId: task.id, task },
      message: '发布任务已创建',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/publish/:taskId - 获取任务状态（轮询）
 */
router.get('/:taskId', (req, res) => {
  const task = getTaskStatus(req.params.taskId);

  if (!task) {
    return res.status(404).json({ success: false, message: '任务不存在' });
  }

  res.json({ success: true, data: task });
});

/**
 * POST /api/publish/republish/:recordId - 基于历史记录重新发布
 */
router.post('/republish/:recordId', async (req, res) => {
  try {
    const { accountIds } = req.body;
    const task = await republishFromRecord(req.params.recordId, accountIds);

    res.json({
      success: true,
      data: { taskId: task.id, task },
      message: '重新发布任务已创建',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
