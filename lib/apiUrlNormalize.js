/** 聚合 API URL 规范化 — 避免只填域名导致 POST / 404 */

function stripTrailingSlash(url) {
  return String(url || '').trim().replace(/\/+$/, '');
}

/** 生图网关根地址，如 https://api.apimart.ai */
function normalizeImageBaseUrl(url) {
  let s = stripTrailingSlash(url);
  if (!s) return '';
  s = s
    .replace(/\/api\/v1\/images\/generations$/i, '')
    .replace(/\/v1\/images\/generations$/i, '')
    .replace(/\/api\/v1$/i, '')
    .replace(/\/v1$/i, '');
  return s;
}

/** Chat 完整地址，如 https://api.apimart.ai/v1/chat/completions */
function normalizeChatUrl(url) {
  let s = stripTrailingSlash(url);
  if (!s) return '';
  if (/\/chat\/completions$/i.test(s)) return s;
  const base = normalizeImageBaseUrl(s);
  return `${base}/v1/chat/completions`;
}

function wrapNetworkError(err, label = 'API') {
  const msg = String(err?.message || err || '');
  if (/fetch failed|ECONNREFUSED|ETIMEDOUT|Connect Timeout|UND_ERR_CONNECT_TIMEOUT|ENOTFOUND|network/i.test(msg)) {
    const e = new Error(
      `${label} 连接失败（网络超时或被拦截），请检查 VPN/代理，或确认服务是否可用`
    );
    e.status = 502;
    return e;
  }
  return err instanceof Error ? err : new Error(msg);
}

module.exports = {
  normalizeImageBaseUrl,
  normalizeChatUrl,
  wrapNetworkError,
};
