/**
 * 数据库服务 - 基于 lowdb 的本地 JSON 文件存储
 */
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const { DATA_DIR } = require('../config/paths');

const DB_PATH = path.join(DATA_DIR, 'db.json');

const defaultData = {
  user: null,
  settings: {
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
  },
};

const LEGACY_KEYS = ['accounts', 'records', 'schedule', 'scheduleLogs', 'tasks'];

let db = null;
const isServerless = Boolean(process.env.VERCEL || process.env.VERCEL_ENV);

function createMemoryDb(initial) {
  return {
    data: JSON.parse(JSON.stringify(initial)),
    async write() {},
  };
}

function stripLegacyPublishData(data) {
  if (!data || typeof data !== 'object') return data;
  for (const key of LEGACY_KEYS) {
    delete data[key];
  }
  if (data.settings) {
    delete data.settings.xhsApi;
    delete data.settings.publish;
  }
  return data;
}

async function initDb() {
  if (isServerless) {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const { JSONFilePreset } = require('lowdb/node');
    db = await JSONFilePreset(DB_PATH, defaultData);
  } else {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const { JSONFilePreset } = require('lowdb/node');
    db = await JSONFilePreset(DB_PATH, defaultData);
    const before = JSON.stringify(db.data);
    stripLegacyPublishData(db.data);
    if (!db.data.settings) {
      db.data.settings = JSON.parse(JSON.stringify(defaultData.settings));
    } else {
      db.data.settings = {
        ...defaultData.settings,
        ...db.data.settings,
        aiApi: { ...defaultData.settings.aiApi, ...(db.data.settings.aiApi || {}), model: '' },
        imageGen: { ...defaultData.settings.imageGen, ...(db.data.settings.imageGen || {}) },
        gptOpen: { ...defaultData.settings.gptOpen, ...(db.data.settings.gptOpen || {}) },
      };
    }
    if (JSON.stringify(db.data) !== before) {
      await db.write();
    }
  }

  if (!db.data.user) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    db.data.user = {
      username: 'admin',
      password: hashedPassword,
      createdAt: new Date().toISOString(),
    };
    await db.write();
  }

  return db;
}

function getDb() {
  if (!db) throw new Error('数据库未初始化，请先调用 initDb()');
  return db;
}

async function saveDb() {
  await getDb().write();
}

module.exports = { initDb, getDb, saveDb, defaultData, stripLegacyPublishData };
