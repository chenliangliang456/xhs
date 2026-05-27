/**
 * 素材库路由 - a/b/c 文件夹管理
 */
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');
const { authMiddleware } = require('../middleware/auth');
const {
  MATERIALS_DIR,
  FOLDERS,
  initMaterialsDir,
  listAll,
  listFolder,
  getMatchedSet,
  getNextIndex,
  standardFilename,
  removeFile,
  removeSet,
  batchRemove,
  importFolderFiles,
  getMaterialsZipPlan,
} = require('../services/materials');

const router = express.Router();
router.use(authMiddleware);

initMaterialsDir();

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const folder = (req.query.folder || '').toLowerCase();
      if (!FOLDERS.includes(folder)) {
        return cb(new Error('folder 参数必须是 a、b 或 c'));
      }
      const dir = path.join(MATERIALS_DIR, folder);
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const folder = (req.query.folder || '').toLowerCase();
      const index = req.query.index || getNextIndex(folder);
      cb(null, standardFilename(folder, index, file.originalname));
    },
  }),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    cb(null, ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.mimetype));
  },
});

const folderUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024, files: 500 },
  fileFilter: (req, file, cb) => {
    cb(null, ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.mimetype));
  },
});

function extractIndexFromFile(folder, filename) {
  const base = path.basename(filename, path.extname(filename));
  const match = base.match(new RegExp(`^${folder}(\\d+)$`, 'i'));
  return match ? match[1] : null;
}

/** 文件夹批量导入逻辑 */
function handleFolderImport(req, res) {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: '请选择文件夹或图片' });
    }

    const paths = req.body.paths;
    const pathList = Array.isArray(paths) ? paths : paths ? [paths] : [];
    const forceFolder = (req.query.target || '').toLowerCase() || null;

    const files = req.files.map((file, i) => ({
      buffer: file.buffer,
      originalname: file.originalname,
      relativePath: pathList[i] || file.originalname,
    }));

    const results = importFolderFiles(files, FOLDERS.includes(forceFolder) ? forceFolder : null);

    if (results.success.length === 0) {
      return res.status(400).json({
        success: false,
        message: '没有可导入的图片，请确保文件夹含 a/b/c 子目录，或文件名为 a1.jpg 格式',
        data: results,
      });
    }

    return res.json({
      success: true,
      data: results,
      message: `成功导入 ${results.success.length} 张，跳过 ${results.skipped.length} 张`,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * POST /api/materials/upload-folder?target=a
 * POST /api/materials/upload?batch=folder&target=a  （同上，兼容两种路径）
 */
router.post('/upload-folder', folderUpload.array('files', 500), handleFolderImport);
router.post('/upload', (req, res, next) => {
  if (req.query.batch === 'folder') {
    return folderUpload.array('files', 500)(req, res, (err) => {
      if (err) return next(err);
      handleFolderImport(req, res);
    });
  }

  return upload.single('file')(req, res, (err) => {
    if (err) return next(err);
    try {
      const folder = (req.query.folder || req.body?.folder || '').toLowerCase();
      if (!FOLDERS.includes(folder)) {
        return res.status(400).json({ success: false, message: '请指定 folder 参数：a、b 或 c' });
      }
      if (!req.file) {
        return res.status(400).json({ success: false, message: '请选择图片文件' });
      }
      const index = extractIndexFromFile(folder, req.file.filename);
      return res.json({
        success: true,
        data: {
          folder,
          filename: req.file.filename,
          index,
          url: `/materials/${folder}/${req.file.filename}`,
          path: `${folder}/${req.file.filename}`,
        },
        message: `已上传到文件夹 ${folder.toUpperCase()}：${req.file.filename}`,
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });
});

router.get('/', (req, res) => {
  res.json({ success: true, data: listAll() });
});

/**
 * GET /api/materials/download-zip
 * GET /api/materials/download-zip?folder=a  仅打包 a 文件夹（按编号排序）
 * 成套模式：set_001/a1.png、b1.png、c1.png …（纯英文路径，内附 README 说明对应套装编号）
 */
router.get('/download-zip', (req, res) => {
  const folder = String(req.query.folder || '').toLowerCase();
  const mode = FOLDERS.includes(folder) ? folder : 'sets';

  try {
    const { entries, readme } = getMaterialsZipPlan({ mode });
    if (!entries.length) {
      return res.status(400).json({ success: false, message: '没有可打包的图片' });
    }

    const date = new Date().toISOString().slice(0, 10);
    const baseName =
      mode === 'sets' ? `materials_sets_${date}.zip` : `materials_${mode}_${date}.zip`;

    const archive = archiver('zip', { zlib: { level: 6 } });
    archive.on('error', (err) => {
      const logger = require('../utils/logger');
      logger.error('[素材ZIP]', err);
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: err.message });
      } else {
        res.destroy(err);
      }
    });

    res.setHeader('Content-Type', 'application/zip');
    /** 仅 ASCII 文件名，避免部分浏览器解析 Content-Disposition 失败 */
    res.setHeader('Content-Disposition', `attachment; filename="${baseName}"`);

    archive.pipe(res);
    archive.append(Buffer.from(readme, 'utf8'), { name: 'README.txt' });
    for (const e of entries) {
      archive.file(e.abs, { name: e.name });
    }
    archive.finalize();
  } catch (error) {
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
});

router.get('/folder/:folder', (req, res) => {
  const folder = req.params.folder.toLowerCase();
  if (!FOLDERS.includes(folder)) {
    return res.status(400).json({ success: false, message: '文件夹必须是 a、b 或 c' });
  }
  res.json({ success: true, data: listFolder(folder) });
});

router.get('/match/:folder/:filename', (req, res) => {
  try {
    const data = getMatchedSet(req.params.folder.toLowerCase(), req.params.filename);
    res.json({ success: true, data });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/** 批量删除（须在 /:folder/:filename 之前注册） */
router.post('/batch-delete', (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: '请选择要删除的素材' });
    }
    const deleted = batchRemove(items);
    res.json({
      success: true,
      data: deleted,
      message: `已删除 ${deleted.length} 张素材`,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/** 删除整套 a/b/c 同编号 */
router.delete('/set/:index', (req, res) => {
  try {
    const deleted = removeSet(req.params.index);
    res.json({
      success: true,
      data: deleted,
      message: `已删除套装 ${req.params.index}（${deleted.length} 张）`,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.delete('/:folder/:filename', (req, res) => {
  try {
    const folder = req.params.folder.toLowerCase();
    const filename = req.params.filename;
    if (!FOLDERS.includes(folder)) {
      return res.status(400).json({ success: false, message: '文件夹必须是 a、b 或 c' });
    }
    const ok = removeFile(folder, filename);
    if (!ok) {
      return res.status(404).json({ success: false, message: '文件不存在' });
    }
    res.json({ success: true, message: '素材已删除' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
