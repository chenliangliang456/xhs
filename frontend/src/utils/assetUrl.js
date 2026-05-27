/** 素材/上传图片 URL — 支持 Vercel 前后端分域 */
const API_ORIGIN = (import.meta.env.VITE_API_ORIGIN || '').replace(/\/$/, '');

export function assetUrl(path) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path) || path.startsWith('data:')) return path;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return API_ORIGIN ? `${API_ORIGIN}${normalized}` : normalized;
}

export function apiBaseUrl() {
  return API_ORIGIN ? `${API_ORIGIN}/api` : '/api';
}
