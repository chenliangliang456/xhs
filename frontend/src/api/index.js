import request from './request';

/** 认证相关 */
export const authApi = {
  login: (data) => request.post('/auth/login', data),
  getProfile: () => request.get('/auth/profile'),
  changePassword: (data) => request.put('/auth/password', data),
};

/** 账号管理 */
export const accountApi = {
  list: () => request.get('/accounts'),
  create: (data) => request.post('/accounts', data),
  update: (id, data) => request.put(`/accounts/${id}`, data),
  remove: (id) => request.delete(`/accounts/${id}`),
  toggle: (id) => request.patch(`/accounts/${id}/toggle`),
};

/** 小红书浏览器登录（自动获取 Cookie） */
export const accountCookieApi = {
  start: (accountId) => request.post('/accounts/cookie/start', accountId ? { accountId } : {}),
  getStatus: (sessionId) => request.get(`/accounts/cookie/${sessionId}/status`),
  confirm: (sessionId, data) => request.post(`/accounts/cookie/${sessionId}/confirm`, data),
  cancel: (sessionId) => request.delete(`/accounts/cookie/${sessionId}`),
};

/** 小红书扫码登录 */
export const accountQrApi = {
  start: () => request.post('/accounts/qr/start'),
  getStatus: (sessionId) => request.get(`/accounts/qr/${sessionId}/status`),
  confirm: (sessionId, data) => request.post(`/accounts/qr/${sessionId}/confirm`, data),
  cancel: (sessionId) => request.delete(`/accounts/qr/${sessionId}`),
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
  /** 上传整个文件夹（含 a/b/c 子目录） */
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
  /** 成套：/materials/download-zip ；单文件夹：?folder=a */
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

/** 构建发布用图片源 */
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
  /** 与定时发布同款逻辑（套装编号 + 配图提示），仅文案、不发布 */
  generateViral: (data) => request.post('/ai/generate-viral', data),
};

/** 发布任务 */
export const publishApi = {
  create: (data) => request.post('/publish', data),
  getStatus: (taskId) => request.get(`/publish/${taskId}`),
  republish: (recordId, data) => request.post(`/publish/republish/${recordId}`, data),
};

/** 定时发布 */
export const scheduleApi = {
  get: () => request.get('/schedule'),
  update: (data) => request.put('/schedule', data),
  logs: (limit = 30) => request.get('/schedule/logs', { params: { limit } }),
  runNow: (data) => request.post('/schedule/run-now', data || {}, { timeout: 600000 }),
  resetToday: () => request.post('/schedule/reset-today'),
};

/** 发布记录 */
export const recordApi = {
  list: (params) => request.get('/records', { params }),
  detail: (id) => request.get(`/records/${id}`),
};

/** 系统配置 */
export const settingsApi = {
  get: () => request.get('/settings'),
  update: (data) => request.put('/settings', data), // 已废弃，配置改由 .env 管理
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
  saveToMaterials: (images) =>
    request.post('/image-gen/save-to-materials', { images }, { timeout: 120000 }),
  generateAbcSet: (data) =>
    request.post('/image-gen/generate-abc-set', data, { timeout: 180000 }),
  saveAbcSet: (data) =>
    request.post('/image-gen/save-abc-set', data, { timeout: 120000 }),
};
