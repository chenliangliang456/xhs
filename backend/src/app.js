/**
 * 小红书多账号智能发布助手 - 后端入口
 */
require('./config/env');

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { initDb } = require('./services/db');
const { config } = require('./config/env');
const { isServerless, UPLOADS_DIR, MATERIALS_DIR, ensureStorageDirs } = require('./config/paths');
const logger = require('./utils/logger');

// 路由
const authRoutes = require('./routes/auth');
const accountRoutes = require('./routes/accounts');
const accountsQrRoutes = require('./routes/accountsQr');
const accountsCookieRoutes = require('./routes/accountsCookie');
const uploadRoutes = require('./routes/upload');
const aiRoutes = require('./routes/ai');
const publishRoutes = require('./routes/publish');
const recordRoutes = require('./routes/records');
const settingsRoutes = require('./routes/settings');
const materialsRoutes = require('./routes/materials');
const imageGenRoutes = require('./routes/imageGen');
const { initMaterialsDir } = require('./services/materials');
const { startKeepAliveScheduler } = require('./services/accountKeepAlive');
const { startScheduleScheduler } = require('./services/scheduleService');
const scheduleRoutes = require('./routes/schedule');
const { getPlaywrightStatus } = require('./config/playwrightEnv');

const app = express();
const PORT = config.port;

let appReady = false;

// 中间件
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// 静态文件 - 上传的图片
app.use('/uploads', express.static(UPLOADS_DIR));

/** 素材图片：仅 /materials/a|b|c/文件名，避免与前端路由 /materials 冲突 */
app.use('/materials', (req, res, next) => {
  if (/^\/[abc]\/.+/i.test(req.path)) {
    return express.static(MATERIALS_DIR)(req, res, next);
  }
  next();
});

// API 路由
app.use('/api/auth', authRoutes);
app.use('/api/accounts/qr', accountsQrRoutes);
app.use('/api/accounts/cookie', accountsCookieRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/publish', publishRoutes);
app.use('/api/records', recordRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/materials', materialsRoutes);
app.use('/api/image-gen', imageGenRoutes);
app.use('/api/schedule', scheduleRoutes);

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: '服务运行正常',
    timestamp: new Date().toISOString(),
    runtime: isServerless() ? 'vercel-serverless' : 'node',
  });
});

// 本地启动：托管前端构建产物（npm run build 后生效）
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

// 全局错误处理
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err.message);
  res.status(500).json({ success: false, message: err.message || '服务器内部错误' });
});

async function createApp() {
  if (appReady) return app;

  ensureStorageDirs();
  await initDb();
  initMaterialsDir();

  if (!isServerless()) {
    const pw = getPlaywrightStatus();
    if (pw.configured) {
      logger.info(`🌐 Playwright Chromium: ${pw.executablePath}`);
    } else {
      logger.warn(`⚠️ Playwright 未安装，请执行: ${pw.installHint}`);
    }
    startKeepAliveScheduler();
    startScheduleScheduler();
  } else {
    logger.info('☁️ Vercel Serverless 模式：定时发布 / 浏览器发帖 / Playwright 不可用');
  }

  appReady = true;
  return app;
}

async function startServer() {
  const application = await createApp();
  application.listen(PORT, () => {
    logger.info(`🚀 小红书发布助手后端已启动: http://localhost:${PORT}`);
    logger.info(`📋 默认账号: admin / admin123`);
    logger.info(`📁 素材库文件夹上传: POST /api/materials/upload?batch=folder`);
  });
  return application;
}

if (require.main === module) {
  startServer().catch((err) => {
    logger.error('启动失败:', err);
    process.exit(1);
  });
}

module.exports = { app, createApp, startServer };
