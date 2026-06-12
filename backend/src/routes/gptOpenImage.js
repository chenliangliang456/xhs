/**
 * GPT 开放生图 — 无额度限制，支持思考模式 / 上传修改 / 取消（客户端）
 */
const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const {
  getHealthPayloadAsync,
  runThinkComplete,
  streamThink,
  runOpenSubmit,
  runOpenPoll,
} = require('../../../lib/gptOpenImage');

const router = express.Router();

router.get('/health', async (req, res) => {
  try {
    const payload = await getHealthPayloadAsync();
    res.json({ success: true, ...payload });
  } catch (err) {
    res.json({ success: true, ...require('../../../lib/gptOpenImage').getHealthPayload() });
  }
});

router.use(authMiddleware);

router.post('/think', async (req, res) => {
  try {
    const data = await runThinkComplete(req.body);
    res.json({ success: true, ...data });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message || '思考失败' });
  }
});

/** SSE 流式思考 — 前端可实时展示 */
router.post('/think-stream', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const ac = new AbortController();
  req.on('close', () => ac.abort());

  try {
    for await (const chunk of streamThink(req.body, ac.signal)) {
      if (ac.signal.aborted) break;
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
    }
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    if (!ac.signal.aborted) {
      res.write(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`);
    }
    res.end();
  }
});

router.post('/generate', async (req, res) => {
  try {
    const data = await runOpenSubmit(req.body);
    res.json({ success: true, ...data });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message || '提交失败' });
  }
});

router.post('/poll', async (req, res) => {
  try {
    const data = await runOpenPoll(req.body);
    res.json({ success: true, ...data });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message || '轮询失败' });
  }
});

module.exports = router;
