/**
 * 数据库服务 - 基于 lowdb 的本地 JSON 文件存储
 */
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const { DATA_DIR } = require('../config/paths');

const DB_PATH = path.join(DATA_DIR, 'db.json');

// 默认数据结构
const defaultData = {
  user: null,
  accounts: [],
  records: [],
  settings: {
    aiApi: {
      url: '',
      headers: {},
      apiKey: '',
      model: 'gpt-3.5-turbo',
      supportVision: false,
    },
    xhsApi: {
      publishUrl: '',
      uploadUrl: '',
    },
    publish: {
      interval: 3000,
      retryCount: 2,
      concurrency: 1,
    },
  },
  tasks: {},
  schedule: {
    enabled: false,
    times: ['09:00', '14:00', '20:00'],
    accountIds: [],
    productForm: {
      productName: '',
      sellingPoints: '',
      productType: '',
      targetAudience: '',
      style: '口语化种草风',
    },
    lastRuns: {},
    usedSetIndexes: [],
  },
  scheduleLogs: [],
};

let db = null;
const isServerless = Boolean(process.env.VERCEL || process.env.VERCEL_ENV);

function createMemoryDb(initial) {
  return {
    data: JSON.parse(JSON.stringify(initial)),
    async write() {},
  };
}

/**
 * 初始化数据库
 */
async function initDb() {
  if (isServerless) {
    db = createMemoryDb(defaultData);
  } else {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    // 仅在非 Serverless 环境加载 lowdb，避免打包器裁剪导致模块异常
    const { JSONFilePreset } = require('lowdb/node');
    db = await JSONFilePreset(DB_PATH, defaultData);
  }

  // 首次启动创建默认管理员账号 admin / admin123
  if (!db.data.user) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    db.data.user = {
      username: 'admin',
      password: hashedPassword,
      createdAt: new Date().toISOString(),
    };
    await db.write();
  }

  if (!db.data.schedule) {
    db.data.schedule = { ...defaultData.schedule };
    await db.write();
  }
  if (!Array.isArray(db.data.scheduleLogs)) {
    db.data.scheduleLogs = [];
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

module.exports = { initDb, getDb, saveDb, defaultData };
