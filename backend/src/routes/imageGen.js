/**
 * 批量文生图路由
 */
const express = require('express');
const fs = require('fs');
const path = require('path');
const { authMiddleware } = require('../middleware/auth');
const { getHealthPayload, runSubmit, runPoll } = require('../services/imageGen');
const { runGenerateAbcSet } = require('../../../lib/abcGenerate');
const { MATERIALS_DIR, FOLDERS, getNextIndex, standardFilename } = require('../services/materials');

const router = express.Router();
router.use(authMiddleware);

router.get('/health', (req, res) => {
  res.json({ success: true, ...getHealthPayload() });
});

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

/** 将 base64 图片保存到素材库 a/b/c 文件夹 */
router.post('/save-to-materials', async (req, res) => {
  try {
    const { images } = req.body;
    if (!Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ success: false, message: '请提供要保存的图片' });
    }

    const saved = [];
    for (const item of images) {
      const folder = String(item.folder || 'a').toLowerCase();
      if (!FOLDERS.includes(folder)) {
        return res.status(400).json({ success: false, message: `folder 必须是 a、b 或 c` });
      }

      const dataUrl = String(item.dataUrl || '');
      const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!match) {
        return res.status(400).json({ success: false, message: '图片数据格式无效' });
      }

      const mime = match[1];
      const ext = mime.includes('jpeg') ? 'jpg' : mime.includes('webp') ? 'webp' : 'png';
      const index = item.index || getNextIndex(folder);
      const filename = standardFilename(folder, index, `image.${ext}`);
      const dir = path.join(MATERIALS_DIR, folder);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, filename), Buffer.from(match[2], 'base64'));

      saved.push({
        folder,
        filename,
        index,
        url: `/materials/${folder}/${filename}`,
      });
    }

    res.json({ success: true, data: saved, message: `已保存 ${saved.length} 张到素材库` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || '保存失败' });
  }
});

/** 保存 ABC 成套（a/b/c 同编号） */
router.post('/save-abc-set', async (req, res) => {
  try {
    const { anchor, bImage, cImage, setIndex } = req.body;
    if (!anchor?.dataUrl || !bImage?.dataUrl || !cImage?.dataUrl) {
      return res.status(400).json({ success: false, message: '缺少 A/B/C 图片数据' });
    }

    const index = setIndex || getNextIndex('a');
    const items = [
      { dataUrl: anchor.dataUrl, folder: 'a', index },
      { dataUrl: bImage.dataUrl, folder: 'b', index },
      { dataUrl: cImage.dataUrl, folder: 'c', index },
    ];

    const saved = [];
    for (const item of items) {
      const match = String(item.dataUrl).match(/^data:([^;]+);base64,(.+)$/);
      if (!match) continue;
      const mime = match[1];
      const ext = mime.includes('jpeg') ? 'jpg' : mime.includes('webp') ? 'webp' : 'png';
      const filename = standardFilename(item.folder, item.index, `image.${ext}`);
      const dir = path.join(MATERIALS_DIR, item.folder);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, filename), Buffer.from(match[2], 'base64'));
      saved.push({ folder: item.folder, filename, index: item.index, url: `/materials/${item.folder}/${filename}` });
    }

    res.json({
      success: true,
      data: saved,
      message: `ABC 套装已保存为 a${index} / b${index} / c${index}`,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || '保存失败' });
  }
});

module.exports = router;
