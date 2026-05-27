/**
 * 批量文生图服务 — 封装 lib/generate.js，统一从 backend/.env 读取配置
 */
const path = require('path');

function applyImageGenEnv() {
  if (process.env.IMAGE_GEN_API_BASE_URL) {
    process.env.API_BASE_URL = process.env.IMAGE_GEN_API_BASE_URL;
  }
  if (process.env.IMAGE_GEN_API_KEY) {
    process.env.API_KEY = process.env.IMAGE_GEN_API_KEY;
  }
}

applyImageGenEnv();

module.exports = require(path.join(__dirname, '../../../lib/generate'));
