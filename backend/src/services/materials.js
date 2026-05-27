/**
 * 素材库服务 - a/b/c 三文件夹，按编号自动搭配（a1+b1+c1）
 */
const fs = require('fs');
const path = require('path');
const { MATERIALS_DIR, UPLOADS_DIR } = require('../config/paths');

const FOLDERS = ['a', 'b', 'c'];
const IMAGE_EXT = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

/** 初始化 a/b/c 文件夹 */
function initMaterialsDir() {
  for (const folder of FOLDERS) {
    const dir = path.join(MATERIALS_DIR, folder);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

/**
 * 从文件名提取编号，如 a1.jpg -> 1, b7.png -> 7
 */
function extractIndex(folder, filename) {
  const base = path.basename(filename, path.extname(filename));
  const prefix = folder.toLowerCase();
  const regex = new RegExp(`^${prefix}(\\d+)$`, 'i');
  const match = base.match(regex);
  return match ? match[1] : null;
}

/**
 * 在文件夹中按编号查找文件
 */
function findByIndex(folder, index) {
  const dir = path.join(MATERIALS_DIR, folder);
  if (!fs.existsSync(dir)) return null;

  const prefix = `${folder.toLowerCase()}${index}`;
  const files = fs.readdirSync(dir);
  const found = files.find((f) => {
    const base = path.basename(f, path.extname(f)).toLowerCase();
    return base === prefix;
  });

  if (!found) return null;

  return buildFileInfo(folder, found);
}

function buildFileInfo(folder, filename) {
  const filePath = path.join(MATERIALS_DIR, folder, filename);
  const stat = fs.statSync(filePath);
  const index = extractIndex(folder, filename);

  return {
    folder,
    filename,
    index,
    url: `/materials/${folder}/${filename}`,
    path: `${folder}/${filename}`,
    size: stat.size,
    updatedAt: stat.mtime.toISOString(),
  };
}

/**
 * 列出单个文件夹内所有素材
 */
function listFolder(folder) {
  const dir = path.join(MATERIALS_DIR, folder);
  if (!fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir)
    .filter((f) => IMAGE_EXT.includes(path.extname(f).toLowerCase()))
    .map((f) => buildFileInfo(folder, f))
    .sort((x, y) => Number(x.index || 0) - Number(y.index || 0));
}

/**
 * 列出全部素材及成套分组
 */
function listAll() {
  initMaterialsDir();

  const folders = {};
  for (const f of FOLDERS) {
    folders[f] = listFolder(f);
  }

  // 收集所有编号
  const indexSet = new Set();
  for (const f of FOLDERS) {
    folders[f].forEach((item) => {
      if (item.index) indexSet.add(item.index);
    });
  }

  const groups = [...indexSet]
    .sort((a, b) => Number(a) - Number(b))
    .map((index) => {
      const a = findByIndex('a', index);
      const b = findByIndex('b', index);
      const c = findByIndex('c', index);
      return {
        index,
        a,
        b,
        c,
        complete: !!(a && b && c),
        label: `套装 ${index}（a${index} + b${index} + c${index}）`,
      };
    });

  return { folders, groups, folderNames: FOLDERS };
}

/**
 * 根据 a/b/c 任一文件夹的选择，获取同编号成套素材
 */
function getMatchedSet(folder, filename) {
  const index = extractIndex(folder, filename);
  if (!index) {
    throw new Error(`文件名格式不正确，请使用 ${folder}1、${folder}2 格式，如 a1.jpg`);
  }

  const a = findByIndex('a', index);
  const b = findByIndex('b', index);
  const c = findByIndex('c', index);

  const selected = { a, b, c }[folder];
  if (!selected) {
    throw new Error(`素材 ${folder}${index} 不存在`);
  }

  const missing = FOLDERS.filter((f) => !{ a, b, c }[f]).map((f) => `${f}${index}`);

  return {
    index,
    items: [a, b, c].filter(Boolean),
    a,
    b,
    c,
    complete: missing.length === 0,
    missing,
    label: `a${index} + b${index} + c${index}`,
  };
}

/**
 * 获取下一个可用编号
 */
function getNextIndex(folder) {
  const list = listFolder(folder);
  const nums = list.map((i) => Number(i.index || 0));
  return String(Math.max(0, ...nums) + 1);
}

/**
 * 生成标准文件名
 */
function standardFilename(folder, index, originalName) {
  const ext = path.extname(originalName).toLowerCase() || '.jpg';
  return `${folder.toLowerCase()}${index}${ext}`;
}

/**
 * 解析相对路径，确定目标 a/b/c 文件夹和文件名
 */
function parseFileTarget(relativePath, originalName) {
  const normalized = (relativePath || originalName || '').replace(/\\/g, '/');
  const parts = normalized.split('/').filter(Boolean);
  const basename = parts[parts.length - 1] || originalName;
  const ext = path.extname(basename).toLowerCase();

  if (!IMAGE_EXT.includes(ext)) {
    return { valid: false, reason: '非图片格式', filename: basename };
  }

  const base = path.basename(basename, ext);

  // 路径中包含 a/b/c 子文件夹：素材/a/a1.jpg
  for (const folder of FOLDERS) {
    const hasFolder = parts.some((p) => p.toLowerCase() === folder);
    if (hasFolder) {
      // 验证文件名符合 a1 格式，或自动使用原文件名
      if (new RegExp(`^${folder}\\d+$`, 'i').test(base)) {
        return { valid: true, folder, filename: basename.toLowerCase() };
      }
      // 在 a 文件夹内但文件名不规范，仍放入该文件夹
      return { valid: true, folder, filename: basename };
    }
  }

  // 文件名本身为 a1.jpg / b7.png
  for (const folder of FOLDERS) {
    if (new RegExp(`^${folder}\\d+$`, 'i').test(base)) {
      return { valid: true, folder, filename: `${base.toLowerCase()}${ext}` };
    }
  }

  return { valid: false, reason: '无法识别所属文件夹', filename: basename };
}

/**
 * 批量导入文件夹中的图片
 * @param {Array} files - [{ buffer, relativePath, originalname }]
 * @param {string|null} forceFolder - 强制导入到指定文件夹
 */
function importFolderFiles(files, forceFolder = null) {
  initMaterialsDir();

  const results = { success: [], skipped: [], errors: [] };
  const batchIndex = { a: Number(getNextIndex('a')), b: Number(getNextIndex('b')), c: Number(getNextIndex('c')) };

  for (const file of files) {
    try {
      let target;

      if (forceFolder && FOLDERS.includes(forceFolder)) {
        const ext = path.extname(file.originalname).toLowerCase();
        if (!IMAGE_EXT.includes(ext)) {
          results.skipped.push({ file: file.originalname, reason: '非图片' });
          continue;
        }
        const base = path.basename(file.originalname, ext);
        let filename = file.originalname;
        if (!new RegExp(`^${forceFolder}\\d+$`, 'i').test(base)) {
          filename = standardFilename(forceFolder, batchIndex[forceFolder], file.originalname);
          batchIndex[forceFolder] += 1;
        }
        target = { valid: true, folder: forceFolder, filename };
      } else {
        target = parseFileTarget(file.relativePath, file.originalname);
      }

      if (!target.valid) {
        results.skipped.push({ file: file.originalname, reason: target.reason });
        continue;
      }

      const destDir = path.join(MATERIALS_DIR, target.folder);
      const destPath = path.join(destDir, target.filename);

      fs.mkdirSync(destDir, { recursive: true });
      fs.writeFileSync(destPath, file.buffer);

      results.success.push({
        folder: target.folder,
        filename: target.filename,
        path: `${target.folder}/${target.filename}`,
        url: `/materials/${target.folder}/${target.filename}`,
      });
    } catch (err) {
      results.errors.push({ file: file.originalname, reason: err.message });
    }
  }

  return results;
}

/**
 * 删除素材
 */
function removeFile(folder, filename) {
  if (!FOLDERS.includes(folder)) {
    throw new Error('无效的文件夹');
  }
  const filePath = path.join(MATERIALS_DIR, folder, filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    return true;
  }
  return false;
}

/** 删除同编号整套 a/b/c */
function removeSet(index) {
  const idx = String(index);
  const deleted = [];
  for (const folder of FOLDERS) {
    const item = findByIndex(folder, idx);
    if (item) {
      removeFile(folder, item.filename);
      deleted.push({ folder, filename: item.filename });
    }
  }
  if (!deleted.length) {
    throw new Error(`套装 ${idx} 不存在`);
  }
  return deleted;
}

/** 批量删除 */
function batchRemove(items) {
  const deleted = [];
  for (const item of items || []) {
    const folder = String(item.folder || '').toLowerCase();
    const filename = String(item.filename || '');
    if (!FOLDERS.includes(folder) || !filename) continue;
    if (removeFile(folder, filename)) {
      deleted.push({ folder, filename });
    }
  }
  return deleted;
}

/**
 * 解析发布/AI 请求中的图片路径
 */
function resolveImagePath(item) {
  if (typeof item === 'string') {
    return path.join(UPLOADS_DIR, item);
  }

  if (item.source === 'material' && item.path) {
    return path.join(MATERIALS_DIR, item.path);
  }

  return path.join(UPLOADS_DIR, item.filename || item.path);
}

function resolveImagePaths(items) {
  return (items || []).map(resolveImagePath);
}

/**
 * 生成素材库 ZIP 打包计划：目录按编号排序，每套内含 aN、bN、cN
 * @param {{ mode: 'sets' | 'a' | 'b' | 'c' }} opts
 * @returns {{ entries: { abs: string, name: string }[], readme: string }}
 */
function getMaterialsZipPlan({ mode = 'sets' } = {}) {
  const entries = [];
  const readmeLines = [
    '素材库 ZIP 说明',
    '================',
    '目录名按套装编号从小到大排序（set_001、set_002 …）。',
    '每个 set_XXX 文件夹对应「套装编号 #N」：内含 aN、bN、cN（扩展名与库内一致）。',
    '缺图套装只包含已有文件。',
    '',
  ];

  if (mode === 'sets') {
    const { groups } = listAll();
    const sorted = [...groups].sort((a, b) => Number(a.index) - Number(b.index));
    const maxIdx = sorted.reduce((m, g) => Math.max(m, Number(g.index) || 0), 0);
    const padLen = Math.max(3, String(maxIdx || 1).length);

    for (const g of sorted) {
      const id = String(g.index).padStart(padLen, '0');
      /** 仅 ASCII 路径，避免部分解压软件 / 系统对中文路径失败 */
      const folder = `set_${id}`;
      for (const role of FOLDERS) {
        const item = g[role];
        if (!item) continue;
        const abs = path.join(MATERIALS_DIR, item.path);
        if (!fs.existsSync(abs)) continue;
        const ext = path.extname(item.filename).toLowerCase() || '.png';
        entries.push({
          abs,
          name: `${folder}/${role.toLowerCase()}${g.index}${ext}`,
        });
      }
    }
    readmeLines.push(`本次共 ${sorted.length} 个套装编号，${entries.length} 个文件。`);
  } else if (FOLDERS.includes(mode)) {
    const list = listFolder(mode);
    readmeLines.push(`仅打包文件夹「${mode.toUpperCase()}」内文件，按编号排序。`);
    const folder = `${mode}_sorted`;
    for (const item of list) {
      const abs = path.join(MATERIALS_DIR, item.path);
      if (!fs.existsSync(abs)) continue;
      entries.push({
        abs,
        name: `${folder}/${item.filename}`,
      });
    }
    readmeLines.push(`本次共 ${entries.length} 个文件。`);
  }

  return { entries, readme: readmeLines.join('\n') };
}

module.exports = {
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
  extractIndex,
  parseFileTarget,
  importFolderFiles,
  resolveImagePaths,
  getMaterialsZipPlan,
};
