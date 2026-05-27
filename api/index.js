/**
 * Vercel Serverless 入口 — 将 Express 挂载为单函数
 */
const serverless = require('serverless-http');

let handler;

module.exports = async (req, res) => {
  if (!handler) {
    const { createApp } = require('../backend/src/app');
    const app = await createApp();
    handler = serverless(app, {
      binary: ['image/*', 'application/zip', 'application/octet-stream'],
    });
  }
  return handler(req, res);
};
