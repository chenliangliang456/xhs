/**
 * 将 data URL 写入素材库（可选 sharp 压缩，减小体积）
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { MATERIALS_DIR, FOLDERS, getNextIndex, standardFilename } = require('../services/materials');

function parseDataUrl(dataUrl) {
  const match = String(dataUrl || '').match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  return { mime: match[1], base64: match[2] };
}

function extFromMime(mime) {
  if (mime.includes('jpeg')) return 'jpg';
  if (mime.includes('webp')) return 'webp';
  if (mime.includes('gif')) return 'gif';
  return 'png';
}

async function compressBuffer(buf) {
  try {
    return await sharp(buf)
      .rotate()
      .resize(2048, 2048, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85, mozjpeg: true })
      .toBuffer();
  } catch {
    return buf;
  }
}

/**
 * @param {{ dataUrl: string, folder: string, index?: string|number }} item
 */
async function saveMaterialFromDataUrl(item) {
  const folder = String(item.folder || 'a').toLowerCase();
  if (!FOLDERS.includes(folder)) {
    const err = new Error('folder 必须是 a、b 或 c');
    err.status = 400;
    throw err;
  }

  const parsed = parseDataUrl(item.dataUrl);
  if (!parsed) {
    const err = new Error('图片数据格式无效');
    err.status = 400;
    throw err;
  }

  let buf = Buffer.from(parsed.base64, 'base64');
  let ext = extFromMime(parsed.mime);
  if (buf.length > 400 * 1024) {
    buf = await compressBuffer(buf);
    ext = 'jpg';
  }

  const index = item.index != null && item.index !== '' ? String(item.index) : getNextIndex(folder);
  const filename = standardFilename(folder, index, `image.${ext}`);
  const dir = path.join(MATERIALS_DIR, folder);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, filename), buf);

  return {
    folder,
    filename,
    index,
    url: `/materials/${folder}/${filename}`,
  };
}

module.exports = { saveMaterialFromDataUrl, parseDataUrl };
