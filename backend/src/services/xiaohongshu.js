/**
 * 小红书发布服务
 * 支持 Cookie 或账号密码两种认证方式，调用可配置的小红书发布接口
 */
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const { config } = require('../config/env');
const { decrypt } = require('./crypto');
const { publishViaBrowser } = require('./browserPublish');
const logger = require('../utils/logger');

/**
 * 获取系统配置中的小红书 API 设置（来自 .env）
 */
function getXhsConfig() {
  return config.xhsApi;
}

/**
 * 构建账号认证信息
 */
function buildAuthHeaders(account) {
  const headers = { 'Content-Type': 'application/json' };

  if (account.authType === 'cookie' && account.cookie) {
    headers.Cookie = decrypt(account.cookie);
  }

  return headers;
}

/**
 * 构建账号认证请求体（密码模式）
 */
function buildAuthBody(account) {
  if (account.authType === 'password') {
    return {
      username: account.username,
      password: decrypt(account.password),
    };
  }
  return {};
}

/**
 * 上传图片到小红书（若配置了 uploadUrl）
 */
async function uploadImages(imagePaths, account) {
  const config = getXhsConfig();
  const uploadUrl = config.uploadUrl;

  if (!uploadUrl) {
    // 未配置上传接口时，返回本地路径作为模拟
    return imagePaths.map((p) => ({
      url: `/uploads/${path.basename(p)}`,
      localPath: p,
    }));
  }

  const authHeaders = buildAuthHeaders(account);
  const uploaded = [];

  for (const imagePath of imagePaths) {
    const form = new FormData();
    form.append('file', fs.createReadStream(imagePath));

    const response = await axios.post(uploadUrl, form, {
      headers: { ...form.getHeaders(), ...authHeaders },
      timeout: 60000,
    });

    uploaded.push(response.data?.data || response.data);
  }

  return uploaded;
}

/**
 * 发布笔记到小红书
 * @param {Object} params - 发布参数
 * @returns {Object} 发布结果
 */
async function publishNote(params) {
  const { account, title, content, tags, imagePaths } = params;
  const xhsConfig = getXhsConfig();
  const publishUrl = xhsConfig.publishUrl;
  const publishMode = config.xhsApi.publishMode || 'browser';

  logger.info(`开始发布到账号: ${account.name} (${account.id}) [mode=${publishMode}]`);

  try {
    // 浏览器自动发布（无需外部接口，需扫码登录 Cookie）
    if (!publishUrl && publishMode === 'browser') {
      return await publishViaBrowser({ account, title, content, tags, imagePaths });
    }

    if (!publishUrl && publishMode === 'mock') {
      await simulatePublish(account);
      return {
        success: true,
        noteId: `mock_${Date.now()}_${account.id.slice(0, 8)}`,
        message: '发布成功（模拟模式）',
        mock: true,
      };
    }

    if (!publishUrl) {
      return {
        success: false,
        message: '未配置发布方式，请设置 XHS_PUBLISH_URL 或 XHS_PUBLISH_MODE=browser',
      };
    }
    // 1. 上传图片
    const images = await uploadImages(imagePaths, account);

    // 2. 组装发布内容
    const tagStr = (tags || []).map((t) => (t.startsWith('#') ? t : `#${t}`)).join(' ');
    const fullContent = `${content}\n\n${tagStr}`.trim();

    const publishPayload = {
      title,
      desc: fullContent,
      content: fullContent,
      images: images.map((img) => img.url || img),
      tags: tags || [],
      ...buildAuthBody(account),
    };

    // 3. 调用 HTTP 发布接口
    const authHeaders = buildAuthHeaders(account);
    const response = await axios.post(publishUrl, publishPayload, {
      headers: authHeaders,
      timeout: 120000,
    });

    const result = response.data;
    if (result.success === false || (result.code !== 0 && result.code !== undefined && result.code !== 200)) {
      throw new Error(result.message || result.msg || '发布失败');
    }

    return {
      success: true,
      noteId: result.data?.noteId || result.noteId || `note_${Date.now()}`,
      message: '发布成功',
    };
  } catch (error) {
    logger.error(`账号 ${account.name} 发布失败:`, error.message);
    return {
      success: false,
      message: error.response?.data?.message || error.message || '发布失败',
    };
  }
}

/**
 * 模拟发布延迟（演示模式）
 */
async function simulatePublish(account) {
  const delay = 1500 + Math.random() * 2000;
  await new Promise((resolve) => setTimeout(resolve, delay));

  // 10% 概率模拟失败（便于测试失败场景）
  if (Math.random() < 0.05) {
    throw new Error('模拟发布失败：网络超时');
  }
}

module.exports = { publishNote, uploadImages };
