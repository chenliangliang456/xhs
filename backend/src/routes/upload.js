/**
 * 图片上传路由 - 支持单张/多张上传、压缩
 */
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const { authMiddleware } = require('../middleware/auth');
const { UPLOADS_DIR, ensureStorageDirs } = require('../config/paths');

const router = express.Router();
router.use(authMiddleware);

ensureStorageDirs();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('仅支持 JPG/PNG/WebP/GIF 格式'));
    }
  },
});

/**
 * POST /api/upload - 上传单张或多张图片（自动压缩）
 */
router.post('/', upload.array('images', 20), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: '请选择图片' });
    }

    const results = [];

    for (const file of req.files) {
      const compressedPath = path.join(UPLOAD_DIR, `compressed_${file.filename}`);

      // 压缩图片：最大宽度 1920px，质量 85%
      await sharp(file.path)
        .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toFile(compressedPath);

      // 删除原图，保留压缩版
      fs.unlinkSync(file.path);
      fs.renameSync(compressedPath, file.path);

      results.push({
        id: uuidv4(),
        filename: file.filename,
        originalName: file.originalname,
        url: `/uploads/${file.filename}`,
        path: file.path,
        size: fs.statSync(file.path).size,
      });
    }

    res.json({ success: true, data: results, message: `成功上传 ${results.length} 张图片` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * DELETE /api/upload/:filename - 删除图片
 */
router.delete('/:filename', (req, res) => {
  try {
    const filePath = path.join(UPLOAD_DIR, req.params.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    res.json({ success: true, message: '图片已删除' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
