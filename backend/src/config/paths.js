/**
 * 数据目录：本地为 backend/ 下；Vercel 为 /tmp
 */
const path = require('path');
const fs = require('fs');

const isServerless = () => !!(process.env.VERCEL || process.env.VERCEL_ENV);

const BACKEND_ROOT = path.join(__dirname, '../..');

function getStorageRoot() {
  if (isServerless()) {
    return process.env.XHS_DATA_DIR || path.join('/tmp', 'xhs-publisher');
  }
  return BACKEND_ROOT;
}

const STORAGE_ROOT = getStorageRoot();
const DATA_DIR = path.join(STORAGE_ROOT, 'data');
const UPLOADS_DIR = path.join(STORAGE_ROOT, 'uploads');
const MATERIALS_DIR = path.join(STORAGE_ROOT, 'materials');
const LOGS_DIR = path.join(STORAGE_ROOT, 'logs');

function ensureStorageDirs() {
  for (const dir of [DATA_DIR, UPLOADS_DIR, MATERIALS_DIR, LOGS_DIR]) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

module.exports = {
  isServerless,
  STORAGE_ROOT,
  BACKEND_ROOT,
  DATA_DIR,
  UPLOADS_DIR,
  MATERIALS_DIR,
  LOGS_DIR,
  ensureStorageDirs,
};
