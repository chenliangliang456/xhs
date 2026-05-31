/**
 * 批量文生图路由
 */
const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { getHealthPayload, runSubmit, runPoll } = require('../services/imageGen');
const { runGenerateAbcSet } = require('../../../lib/abcGenerate');
const { saveMaterialFromDataUrl } = require('../utils/saveMaterialImage');

const router = express.Router();

/** 健康检查无需登录，避免 token 过期时误显示「API 未配置」 */
router.get('/health', (req, res) => {
  res.json({ success: true, ...getHealthPayload() });
});

router.use(authMiddleware);

router.post('/generate', async (req, res) => {
  try {
    const data = await runSubmit(req.body);
    res.json({ success: true, ...data });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message || '提交失败' });
  }
});

router.post('/poll', async (req, res) => {
  try {
    const data = await runPoll(req.body);
    res.json({ success: true, ...data });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message || '轮询失败' });
  }
});

/** 以 A 锚点生成 B（五宫格）+ C（产品信息图） */
router.post('/generate-abc-set', async (req, res) => {
  try {
    const data = await runGenerateAbcSet(req.body);
    res.json({ success: true, ...data });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message || 'ABC 套装生成失败' });
  }
});

/** 单张保存（推荐，避免 Vercel 413） */
router.post('/save-one', async (req, res) => {
  try {
    const saved = await saveMaterialFromDataUrl(req.body);
    res.json({ success: true, data: saved, message: '已保存到素材库' });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message || '保存失败' });
  }
});

/** 批量保存（兼容旧客户端；线上建议逐张调用 save-one） */
router.post('/save-to-materials', async (req, res) => {
  try {
    const { images } = req.body;
    if (!Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ success: false, message: '请提供要保存的图片' });
    }

    const saved = [];
    for (const item of images) {
      saved.push(await saveMaterialFromDataUrl(item));
    }

    res.json({ success: true, data: saved, message: `已保存 ${saved.length} 张到素材库` });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ success: false, message: err.message || '保存失败' });
  }
});

/** 保存 ABC 成套（a/b/c 同编号）— 服务端逐张写入 */
router.post('/save-abc-set', async (req, res) => {
  try {
    const { anchor, bImage, cImage, setIndex } = req.body;
    if (!anchor?.dataUrl || !bImage?.dataUrl || !cImage?.dataUrl) {
      return res.status(400).json({ success: false, message: '缺少 A/B/C 图片数据' });
    }

    const index = setIndex != null && setIndex !== '' ? String(setIndex) : undefined;
    const items = [
      { dataUrl: anchor.dataUrl, folder: 'a', index },
      { dataUrl: bImage.dataUrl, folder: 'b', index },
      { dataUrl: cImage.dataUrl, folder: 'c', index },
    ];

    const saved = [];
    for (const item of items) {
      saved.push(await saveMaterialFromDataUrl(item));
    }

    const idx = saved[0]?.index || index || '';
    res.json({
      success: true,
      data: saved,
      message: `ABC 套装已保存为 a${idx} / b${idx} / c${idx}`,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || '保存失败' });
  }
});

module.exports = router;
