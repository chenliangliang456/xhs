/**
 * API 密钥与接口配置 — 支持 .env 默认值 + 设置页保存（db.json 覆盖）
 */
const { config } = require('../config/env');
const { getDb, saveDb } = require('./db');
const { normalizeImageBaseUrl, normalizeChatUrl } = require('../../../lib/apiUrlNormalize');

const DEFAULT_DB_SETTINGS = {
  aiApi: {
    url: '',
    apiKey: '',
    model: '',
  },
  imageGen: {
    apiBaseUrl: '',
    apiKey: '',
  },
  gptOpen: {
    imageApiBaseUrl: '',
    imageApiKey: '',
    imageModel: '',
    chatUrl: '',
    chatApiKey: '',
    chatModel: '',
  },
};

function pickStr(...vals) {
  for (const v of vals) {
    const s = String(v ?? '').trim();
    if (s) return s;
  }
  return '';
}

function getDbSettings() {
  try {
    const db = getDb();
    const s = db.data.settings || {};
    return {
      aiApi: { ...DEFAULT_DB_SETTINGS.aiApi, ...(s.aiApi || {}) },
      imageGen: { ...DEFAULT_DB_SETTINGS.imageGen, ...(s.imageGen || {}) },
      gptOpen: { ...DEFAULT_DB_SETTINGS.gptOpen, ...(s.gptOpen || {}) },
    };
  } catch {
    return JSON.parse(JSON.stringify(DEFAULT_DB_SETTINGS));
  }
}

/** 合并 .env 与数据库，数据库非空字段优先 */
function getEffectiveSettings() {
  const db = getDbSettings();
  const env = config;

  const aiApi = {
    url: normalizeChatUrl(pickStr(db.aiApi.url, env.aiApi.url)),
    apiKey: pickStr(db.aiApi.apiKey, env.aiApi.apiKey),
    model: pickStr(db.aiApi.model, env.aiApi.model, 'gpt-4o-mini'),
    supportVision: env.aiApi.supportVision,
    headers: env.aiApi.headers,
    fallbackMock: env.aiApi.fallbackMock,
    forceMock: env.aiApi.forceMock,
  };

  const imageGen = {
    apiBaseUrl: normalizeImageBaseUrl(pickStr(db.imageGen.apiBaseUrl, env.imageGen.apiBaseUrl)),
    apiKey: pickStr(db.imageGen.apiKey, env.imageGen.apiKey),
  };

  const gptOpen = {
    imageApiBaseUrl: normalizeImageBaseUrl(
      pickStr(
        db.gptOpen.imageApiBaseUrl,
        env.gptOpen.imageApiBaseUrl,
        imageGen.apiBaseUrl
      )
    ),
    imageApiKey: pickStr(
      db.gptOpen.imageApiKey,
      env.gptOpen.imageApiKey,
      imageGen.apiKey
    ),
    imageModel: pickStr(db.gptOpen.imageModel, env.gptOpen.imageModel, 'gpt-image-2'),
    chatUrl: normalizeChatUrl(pickStr(db.gptOpen.chatUrl, env.gptOpen.chatUrl, aiApi.url)),
    chatApiKey: pickStr(db.gptOpen.chatApiKey, env.gptOpen.chatApiKey, aiApi.apiKey),
    chatModel: pickStr(db.gptOpen.chatModel, env.gptOpen.chatModel, aiApi.model),
  };

  return { aiApi, imageGen, gptOpen };
}

function maskKey(key) {
  const s = String(key || '').trim();
  if (!s) return '';
  if (s.length <= 8) return '******';
  return `${s.slice(0, 4)}******${s.slice(-4)}`;
}

function getPublicSettings() {
  const eff = getEffectiveSettings();
  const db = getDbSettings();
  const hasDbAi = !!(db.aiApi.apiKey || db.aiApi.url);
  const hasDbImage = !!(db.imageGen.apiKey || db.imageGen.apiBaseUrl);
  const hasDbGptImage = !!(db.gptOpen.imageApiKey || db.gptOpen.imageApiBaseUrl);
  const hasDbGptChat = !!(db.gptOpen.chatApiKey || db.gptOpen.chatUrl);

  return {
    source: hasDbAi || hasDbImage || hasDbGptImage || hasDbGptChat ? 'db+env' : 'env',
    aiApi: {
      url: eff.aiApi.url,
      apiKey: eff.aiApi.apiKey ? maskKey(eff.aiApi.apiKey) : '',
      apiKeyConfigured: !!eff.aiApi.apiKey,
      model: eff.aiApi.model,
      supportVision: eff.aiApi.supportVision,
      configured: !!(eff.aiApi.url && eff.aiApi.apiKey),
      savedInApp: !!db.aiApi.apiKey,
    },
    imageGen: {
      apiBaseUrl: eff.imageGen.apiBaseUrl,
      apiKey: eff.imageGen.apiKey ? maskKey(eff.imageGen.apiKey) : '',
      apiKeyConfigured: !!eff.imageGen.apiKey,
      configured: !!(eff.imageGen.apiBaseUrl && eff.imageGen.apiKey),
      savedInApp: !!db.imageGen.apiKey,
    },
    gptOpen: {
      imageApiBaseUrl: eff.gptOpen.imageApiBaseUrl,
      imageApiKey: eff.gptOpen.imageApiKey ? maskKey(eff.gptOpen.imageApiKey) : '',
      imageApiKeyConfigured: !!eff.gptOpen.imageApiKey,
      imageModel: eff.gptOpen.imageModel,
      chatUrl: eff.gptOpen.chatUrl,
      chatApiKey: eff.gptOpen.chatApiKey ? maskKey(eff.gptOpen.chatApiKey) : '',
      chatApiKeyConfigured: !!eff.gptOpen.chatApiKey,
      chatModel: eff.gptOpen.chatModel,
      imageConfigured: !!(eff.gptOpen.imageApiBaseUrl && eff.gptOpen.imageApiKey),
      thinkConfigured: !!(eff.gptOpen.chatUrl && eff.gptOpen.chatApiKey),
      imageSavedInApp: !!db.gptOpen.imageApiKey,
      chatSavedInApp: !!db.gptOpen.chatApiKey,
    },
  };
}

/** 写入 process.env，供 lib/generate.js / gptOpenImage 读取 */
function syncProcessEnv() {
  const eff = getEffectiveSettings();

  if (eff.aiApi.url) process.env.AI_API_URL = eff.aiApi.url;
  if (eff.aiApi.apiKey) process.env.AI_API_KEY = eff.aiApi.apiKey;
  if (eff.aiApi.model) process.env.AI_API_MODEL = eff.aiApi.model;

  if (eff.imageGen.apiBaseUrl) {
    process.env.IMAGE_GEN_API_BASE_URL = eff.imageGen.apiBaseUrl;
    process.env.API_BASE_URL = eff.imageGen.apiBaseUrl;
  }
  if (eff.imageGen.apiKey) {
    process.env.IMAGE_GEN_API_KEY = eff.imageGen.apiKey;
    process.env.API_KEY = eff.imageGen.apiKey;
  }

  if (eff.gptOpen.imageApiBaseUrl) {
    process.env.GPT_OPEN_IMAGE_API_BASE_URL = eff.gptOpen.imageApiBaseUrl;
  }
  if (eff.gptOpen.imageApiKey) {
    process.env.GPT_OPEN_IMAGE_API_KEY = eff.gptOpen.imageApiKey;
  }
  if (eff.gptOpen.imageModel) {
    process.env.GPT_OPEN_IMAGE_MODEL = eff.gptOpen.imageModel;
  }
  if (eff.gptOpen.chatUrl) {
    process.env.GPT_OPEN_CHAT_URL = eff.gptOpen.chatUrl;
  }
  if (eff.gptOpen.chatApiKey) {
    process.env.GPT_OPEN_CHAT_API_KEY = eff.gptOpen.chatApiKey;
  }
  if (eff.gptOpen.chatModel) {
    process.env.GPT_OPEN_CHAT_MODEL = eff.gptOpen.chatModel;
  }

  return eff;
}

function mergeSection(current, incoming, secretFields = ['apiKey']) {
  const next = { ...current };
  for (const [key, val] of Object.entries(incoming || {})) {
    if (val === undefined || val === null) continue;
    const s = String(val).trim();
    if (secretFields.includes(key)) {
      if (s) next[key] = s;
      continue;
    }
    next[key] = s;
  }
  return next;
}

async function saveApiSettings(body = {}) {
  const db = getDb();
  if (!db.data.settings) {
    db.data.settings = JSON.parse(JSON.stringify(DEFAULT_DB_SETTINGS));
  }

  if (body.aiApi) {
    db.data.settings.aiApi = mergeSection(
      { ...DEFAULT_DB_SETTINGS.aiApi, ...(db.data.settings.aiApi || {}) },
      body.aiApi,
      ['apiKey']
    );
  }
  if (body.imageGen) {
    db.data.settings.imageGen = mergeSection(
      { ...DEFAULT_DB_SETTINGS.imageGen, ...(db.data.settings.imageGen || {}) },
      body.imageGen,
      ['apiKey']
    );
  }
  if (body.gptOpen) {
    db.data.settings.gptOpen = mergeSection(
      { ...DEFAULT_DB_SETTINGS.gptOpen, ...(db.data.settings.gptOpen || {}) },
      body.gptOpen,
      ['imageApiKey', 'chatApiKey']
    );
  }

  await saveDb();
  syncProcessEnv();
  try {
    const { invalidateThinkProbeCache } = require('../../../lib/gptOpenImage');
    invalidateThinkProbeCache?.();
  } catch {
    /* ignore */
  }
  return getPublicSettings();
}

function getAiRuntimeConfig() {
  return getEffectiveSettings().aiApi;
}

module.exports = {
  getEffectiveSettings,
  getPublicSettings,
  syncProcessEnv,
  saveApiSettings,
  getAiRuntimeConfig,
  DEFAULT_DB_SETTINGS,
};
