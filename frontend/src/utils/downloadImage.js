/** 浏览器下载 data URL 图片 / 文本 */

export function parseDataUrl(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') return null;
  const [meta, base64] = dataUrl.split(',');
  if (!base64) return null;
  const mime = (meta.match(/data:([^;]+)/) || [])[1] || 'image/png';
  return { base64, mime };
}

export function extFromMime(mime) {
  if (mime.includes('jpeg')) return 'jpg';
  if (mime.includes('webp')) return 'webp';
  if (mime.includes('gif')) return 'gif';
  return 'png';
}

export function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function buildImageFileName(prefix = 'gpt-open', ext = 'png') {
  const ts = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  return `${prefix}_${ts}.${ext}`;
}

export function buildTextFileName(prefix = 'gpt-think') {
  const ts = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  return `${prefix}_${ts}.txt`;
}

export function downloadDataUrlImage(dataUrl, fileName) {
  const parsed = parseDataUrl(dataUrl);
  if (!parsed) throw new Error('图片数据无效');
  const bytes = Uint8Array.from(atob(parsed.base64), (c) => c.charCodeAt(0));
  const name = fileName || buildImageFileName('gpt-open', extFromMime(parsed.mime));
  downloadBlob(new Blob([bytes], { type: parsed.mime }), name);
}

export function downloadTextFile(content, fileName) {
  const blob = new Blob([String(content || '')], { type: 'text/plain;charset=utf-8' });
  downloadBlob(blob, fileName);
}
