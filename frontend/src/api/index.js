import request from './request';

/** 认证相关 */
export const authApi = {
  login: (data) => request.post('/auth/login', data),
  getProfile: () => request.get('/auth/profile'),
  changePassword: (data) => request.put('/auth/password', data),
};

/** 素材库 */
export const materialApi = {
  list: () => request.get('/materials'),
  listFolder: (folder) => request.get(`/materials/folder/${folder}`),
  match: (folder, filename) => request.get(`/materials/match/${folder}/${filename}`),
  upload: (file, folder, index) => {
    const formData = new FormData();
    formData.append('file', file);
    return request.post(`/materials/upload?folder=${folder}&index=${index}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  uploadFolder: (files, targetFolder) => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
      formData.append('paths', file.webkitRelativePath || file.name);
    });
    const query = targetFolder
      ? `?batch=folder&target=${targetFolder}`
      : '?batch=folder';
    return request.post(`/materials/upload${query}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 300000,
    });
  },
  remove: (folder, filename) => request.delete(`/materials/${folder}/${filename}`),
  removeSet: (index) => request.delete(`/materials/set/${index}`),
  batchRemove: (items) => request.post('/materials/batch-delete', { items }),
  downloadZipUrl: (folder) => {
    const q =
      folder && ['a', 'b', 'c'].includes(folder) ? `?folder=${folder}` : '';
    const path = `/api/materials/download-zip${q}`;
    const origin =
      (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_ORIGIN?.replace(/\/$/, '')) ||
      (typeof window !== 'undefined' && window.location?.origin) ||
      '';
    if (origin) return new URL(path, origin).href;
    return path;
  },
};

/** 构建 AI 文案配图源 */
export function buildImageSources(images) {
  return images.map((img) => {
    if (img.source === 'material') {
      return { source: 'material', path: img.path || `${img.folder}/${img.filename}` };
    }
    return { source: 'upload', filename: img.filename };
  });
}

export const uploadApi = {
  upload: (formData) =>
    request.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  remove: (filename) => request.delete(`/upload/${filename}`),
};

/** AI 文案生成 */
export const aiApi = {
  generate: (data) => request.post('/ai/generate', data),
  generateViral: (data) => request.post('/ai/generate-viral', data),
  generateAbcCopy: (data) =>
    request.post('/ai/generate-abc-copy', data, { timeout: 120000 }),
};

/** 系统配置 */
export const settingsApi = {
  get: () => request.get('/settings'),
  saveApiKeys: (data) => request.put('/settings/api-keys', data),
};

/** 健康检查 */
export const healthApi = {
  check: () => request.get('/health'),
};

/** AI 批量文生图 */
export const imageGenApi = {
  health: () => request.get('/image-gen/health'),
  generate: (data) => request.post('/image-gen/generate', data, { timeout: 180000 }),
  poll: (data) => request.post('/image-gen/poll', data, { timeout: 180000 }),
  saveOneToMaterials: (item) =>
    request.post('/image-gen/save-one', item, { timeout: 120000 }),
  saveToMaterials: (images) =>
    request.post('/image-gen/save-to-materials', { images }, { timeout: 120000 }),
  generateAbcSet: (data) =>
    request.post('/image-gen/generate-abc-set', data, { timeout: 180000 }),
  generateCOnly: (data) =>
    request.post('/image-gen/generate-c-only', data, { timeout: 180000 }),
  saveAbcSet: (data) =>
    request.post('/image-gen/save-abc-set', data, { timeout: 120000 }),
};

/** GPT 开放生图 — 无额度限制备用通道 */
export const gptOpenApi = {
  health: () => request.get('/gpt-open/health'),
  think: (data) => request.post('/gpt-open/think', data, { timeout: 120000 }),
  generate: (data) => request.post('/gpt-open/generate', data, { timeout: 180000 }),
  poll: (data) => request.post('/gpt-open/poll', data, { timeout: 180000 }),
};
