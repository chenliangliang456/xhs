/**
 * 环境变量配置 - 所有 API 接口配置从 .env 读取
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

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
    fallbackMock: process.env.AI_FALLBACK_MOCK !== 'false',
    forceMock: parseBool(process.env.AI_FORCE_MOCK),
  },

  imageGen: {
    apiBaseUrl: process.env.IMAGE_GEN_API_BASE_URL || process.env.API_BASE_URL || '',
    apiKey: process.env.IMAGE_GEN_API_KEY || process.env.API_KEY || '',
  },

  gptOpen: {
    imageApiBaseUrl:
      process.env.GPT_OPEN_IMAGE_API_BASE_URL ||
      process.env.IMAGE_GEN_API_BASE_URL ||
      process.env.API_BASE_URL ||
      '',
    imageApiKey:
      process.env.GPT_OPEN_IMAGE_API_KEY ||
      process.env.IMAGE_GEN_API_KEY ||
      process.env.API_KEY ||
      '',
    imageModel: process.env.GPT_OPEN_IMAGE_MODEL || 'gpt-image-2',
    chatUrl: process.env.GPT_OPEN_CHAT_URL || process.env.AI_API_URL || '',
    chatApiKey: process.env.GPT_OPEN_CHAT_API_KEY || process.env.AI_API_KEY || '',
    chatModel: process.env.GPT_OPEN_CHAT_MODEL || process.env.AI_API_MODEL || 'deepseek-chat',
  },
};

function getPublicSettings() {
  return {
    source: 'env',
    aiApi: {
      url: config.aiApi.url,
      apiKey: config.aiApi.apiKey ? '******' : '',
      model: config.aiApi.model,
      supportVision: config.aiApi.supportVision,
      headers: config.aiApi.headers,
      configured: !!config.aiApi.url && !!config.aiApi.apiKey,
    },
    imageGen: {
      apiBaseUrl: config.imageGen.apiBaseUrl,
      apiKey: config.imageGen.apiKey ? '******' : '',
      configured: !!(config.imageGen.apiBaseUrl && config.imageGen.apiKey),
    },
    gptOpen: {
      imageApiBaseUrl: config.gptOpen.imageApiBaseUrl,
      imageApiKey: config.gptOpen.imageApiKey ? '******' : '',
      imageModel: config.gptOpen.imageModel,
      chatUrl: config.gptOpen.chatUrl,
      chatApiKey: config.gptOpen.chatApiKey ? '******' : '',
      chatModel: config.gptOpen.chatModel,
      imageConfigured: !!(config.gptOpen.imageApiBaseUrl && config.gptOpen.imageApiKey),
      thinkConfigured: !!(config.gptOpen.chatUrl && config.gptOpen.chatApiKey),
    },
  };
}

module.exports = { config, getPublicSettings };
