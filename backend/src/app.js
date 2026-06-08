/**
 * 小红书内容创作助手 - 后端入口
 */
require('./config/env');

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { config } = require('./config/env');
const { isServerless, UPLOADS_DIR, MATERIALS_DIR, ensureStorageDirs } = require('./config/paths');
const logger = require('./utils/logger');

const authRoutes = require('./routes/auth');
const uploadRoutes = require('./routes/upload');
const aiRoutes = require('./routes/ai');
const settingsRoutes = require('./routes/settings');
const materialsRoutes = require('./routes/materials');
const imageGenRoutes = require('./routes/imageGen');
const { initMaterialsDir } = require('./services/materials');

const app = express();
const PORT = config.port;

let appReady = false;
let initPromise = null;

function asMiddleware(mod) {
  return mod && typeof mod === 'object' && mod.default ? mod.default : mod;
}

function safeUse(routePath, mod) {
  const mw = asMiddleware(mod);
  if (typeof mw === 'function') {
    app.use(routePath, mw);
    return;
  }
  logger.warn(`⚠️ 路由未挂载：${routePath}（导出类型=${typeof mw}）`);
}

function getInitDb() {
  const mod = require('./services/db');
  const queue = [mod];
  const seen = new Set();
  while (queue.length) {
    const cur = queue.shift();
    if (!cur || seen.has(cur)) continue;
    seen.add(cur);
    if (typeof cur === 'function') return cur;
    if (typeof cur?.initDb === 'function') return cur.initDb;
    if (typeof cur === 'object') {
      for (const k of Object.keys(cur)) queue.push(cur[k]);
    }
  }
  return null;
}

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(async (req, res, next) => {
  try {
    await ensureInitialized();
    next();
  } catch (err) {
    next(err);
  }
});

app.use('/uploads', express.static(UPLOADS_DIR));

app.use('/materials', (req, res, next) => {
  if (/^\/[abc]\/.+/i.test(req.path)) {
    return express.static(MATERIALS_DIR)(req, res, next);
  }
  next();
});

safeUse('/api/auth', authRoutes);
safeUse('/api/upload', uploadRoutes);
safeUse('/api/ai', aiRoutes);
safeUse('/api/settings', settingsRoutes);
safeUse('/api/materials', materialsRoutes);
safeUse('/api/image-gen', imageGenRoutes);

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: '服务运行正常',
    timestamp: new Date().toISOString(),
    runtime: isServerless() ? 'vercel-serverless' : 'node',
  });
});

if (!isServerless()) {
  const frontendDist = path.join(__dirname, '../../frontend/dist');
  if (fs.existsSync(path.join(frontendDist, 'index.html'))) {
    app.use(express.static(frontendDist));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
      if (/^\/materials\/[abc]\/.+/i.test(req.path)) return next();
      res.sendFile(path.join(frontendDist, 'index.html'));
    });
    logger.info(`🎨 前端静态文件: ${frontendDist}`);
  }
}

app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err.message);
  res.status(500).json({ success: false, message: err.message || '服务器内部错误' });
});

async function ensureInitialized() {
  if (appReady) return;
  if (!initPromise) {
    initPromise = (async () => {
      ensureStorageDirs();
      const initDb = getInitDb();
      if (typeof initDb !== 'function') {
        const mod = require('./services/db');
        throw new Error(`数据库模块加载失败：initDb 不可用（exports: ${Object.keys(mod || {}).join(',') || 'none'}）`);
      }
      await initDb();
      initMaterialsDir();
      appReady = true;
    })();
  }
  await initPromise;
}

async function createApp() {
  await ensureInitialized();
  return app;
}

async function startServer() {
  const application = await createApp();
  application.listen(PORT, () => {
    logger.info(`🚀 小红书内容助手后端已启动: http://localhost:${PORT}`);
    logger.info(`📋 默认账号: admin / admin123`);
    logger.info(`📁 素材库: POST /api/materials/upload?batch=folder`);
  });
  return application;
}

if (require.main === module) {
  startServer().catch((err) => {
    logger.error('启动失败:', err);
    process.exit(1);
  });
}

module.exports = app;
module.exports.app = app;
module.exports.createApp = createApp;
module.exports.startServer = startServer;
