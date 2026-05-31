/** 素材/上传图片 URL — 支持前后端分域 + 多服务前缀 */
const API_ORIGIN = (import.meta.env.VITE_API_ORIGIN || '').replace(/\/$/, '');
const defaultApiPrefix = import.meta.env.PROD ? '/_/backend/api' : '/api';
const API_PREFIX = (import.meta.env.VITE_API_PREFIX || defaultApiPrefix).replace(/\/$/, '');
const ASSET_PREFIX = (import.meta.env.VITE_ASSET_PREFIX || '').replace(/\/$/, '');

export function assetUrl(path) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path) || path.startsWith('data:')) return path;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  const withPrefix = ASSET_PREFIX ? `${ASSET_PREFIX}${normalized}` : normalized;
  return API_ORIGIN ? `${API_ORIGIN}${withPrefix}` : withPrefix;
}

export function apiBaseUrl() {
  return API_ORIGIN ? `${API_ORIGIN}${API_PREFIX}` : API_PREFIX;
}
