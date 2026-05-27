/**
 * 环境变量配置 - 所有 API 接口配置从 .env 读取
 * 复制 .env.example 为 .env 后填写即可
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { setupPlaywrightEnv } = require('./playwrightEnv');

// 解析并固定 Chromium 路径（忽略无效的沙箱临时目录）
setupPlaywrightEnv();

function parseBool(val) {
  return val === 'true' || val === '1';
}

function parseJson(val, fallback = {}) {
  if (!val) return fallback;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}

const config = {
  port: Number(process.env.PORT) || 3000,
  jwtSecret: process.env.JWT_SECRET || 'xhs-publisher-jwt-secret-2024',
  encryptKey: process.env.ENCRYPT_KEY || 'xhs-publisher-secret-key-32bytes!!',

  aiApi: {
    url: process.env.AI_API_URL || '',
    apiKey: process.env.AI_API_KEY || '',
    model: process.env.AI_API_MODEL || 'deepseek-chat',
    supportVision: parseBool(process.env.AI_SUPPORT_VISION),
    headers: parseJson(process.env.AI_API_HEADERS),
    /** API 失败时自动用本地模拟文案（默认开启，避免余额不足等导致 500） */
    fallbackMock: process.env.AI_FALLBACK_MOCK !== 'false',
    forceMock: parseBool(process.env.AI_FORCE_MOCK),
  },

  xhsApi: {
    publishUrl: process.env.XHS_PUBLISH_URL || '',
    uploadUrl: process.env.XHS_UPLOAD_URL || '',
    /** browser=浏览器自动发（默认）| api=HTTP接口 | mock=仅模拟 */
    publishMode: (process.env.XHS_PUBLISH_MODE || 'browser').toLowerCase(),
  },

  publish: {
    interval: Number(process.env.PUBLISH_INTERVAL) || 3000,
    retryCount: Number(process.env.PUBLISH_RETRY_COUNT ?? 2),
    concurrency: Number(process.env.PUBLISH_CONCURRENCY) || 1,
  },

  imageGen: {
    apiBaseUrl: process.env.IMAGE_GEN_API_BASE_URL || process.env.API_BASE_URL || '',
    apiKey: process.env.IMAGE_GEN_API_KEY || process.env.API_KEY || '',
  },
};

/** 返回给前端的配置（API Key 脱敏） */
function getPublicSettings() {
  return {
    source: 'env',
    aiApi: {
      url: config.aiApi.url,
      apiKey: config.aiApi.apiKey ? '******' : '',
      model: config.aiApi.model,
      supportVision: config.aiApi.supportVision,
      headers: config.aiApi.headers,
      configured: !!config.aiApi.url,
    },
    xhsApi: {
      publishUrl: config.xhsApi.publishUrl,
      uploadUrl: config.xhsApi.uploadUrl,
      publishMode: config.xhsApi.publishMode,
      configured: !!config.xhsApi.publishUrl,
      browserPublish: !config.xhsApi.publishUrl && config.xhsApi.publishMode === 'browser',
    },
    publish: { ...config.publish },
    imageGen: {
      apiBaseUrl: config.imageGen.apiBaseUrl,
      apiKey: config.imageGen.apiKey ? '******' : '',
      configured: !!(config.imageGen.apiBaseUrl && config.imageGen.apiKey),
    },
  };
}

module.exports = { config, getPublicSettings };
