/**
 * AI 文案生成服务 - 转发请求到第三方 AI API
 */
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { config } = require('../config/env');
const logger = require('../utils/logger');
const { buildAbcViralPrompt, buildMockAbcCopy, EMOJI_REQUIREMENTS } = require('../../../lib/xhsTrends');

/**
 * 获取 AI API 配置（来自 .env）
 */
function getAiConfig() {
  return config.aiApi;
}

/**
 * 从 axios 错误中提取可读信息
 */
function extractApiError(error) {
  const data = error.response?.data;
  if (!data) return error.message;
  if (typeof data === 'string') return data;
  return (
    data.error?.message ||
    data.message ||
    data.msg ||
    (data.error && typeof data.error === 'string' ? data.error : null) ||
    error.message
  );
}

/**
 * 构建 AI 请求 Prompt
 */
function buildPrompt(params) {
  const {
    productName,
    sellingPoints,
    productType,
    targetAudience,
    style,
    setIndex,
    variantHint,
  } = params;

  const setBlock = setIndex
    ? `\n【本次素材】套装编号 a${setIndex} / b${setIndex} / c${setIndex}（请结合所附产品图理解画面内容）`
    : '';
  const uniqueBlock = variantHint
    ? `\n【重要】${variantHint}`
    : setIndex
      ? `\n【重要】这是第 ${setIndex} 套笔记，标题、正文、标签必须与此前所有套装完全不同，禁止重复句式、角度和标签组合。`
      : '';

  return `你是一位专业的小红书爆款文案写手。请根据以下产品信息${setIndex ? '与配图' : ''}，生成小红书风格的种草文案。

${EMOJI_REQUIREMENTS}

产品名称：${productName}
产品卖点：${sellingPoints}
产品类型：${productType || '通用'}
适用人群：${targetAudience || '大众'}
风格要求：${style || '口语化、种草风、有营销感'}${setBlock}${uniqueBlock}

请严格以 JSON 格式返回，不要包含其他文字：
{
  "title": "小红书爆款标题（20字以内，必须含2-3个emoji）",
  "content": "正文文案（300-500字，口语化种草，每段带emoji，全文至少15个emoji）",
  "tags": ["标签1", "标签2", "标签3", "标签4", "标签5"]
}`;
}

/**
 * 解析 AI 返回内容为结构化数据
 */
function parseAiResponse(raw) {
  let text = typeof raw === 'string' ? raw : JSON.stringify(raw);

  const jsonMatch = text.match(/\{[\s\S]*"title"[\s\S]*"content"[\s\S]*"tags"[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        title: parsed.title || '',
        content: parsed.content || '',
        tags: Array.isArray(parsed.tags) ? parsed.tags : [],
      };
    } catch {
      // 继续尝试其他解析方式
    }
  }

  if (raw && typeof raw === 'object') {
    const data = raw.data || raw.result || raw;
    if (data.title || data.content) {
      return {
        title: data.title || '',
        content: data.content || '',
        tags: Array.isArray(data.tags) ? data.tags : [],
      };
    }
  }

  return null;
}

/**
 * 本地模拟生成文案（未配置 API 或 API 失败时使用）
 */
function generateMockCopy(params) {
  const { productName, sellingPoints, productType, targetAudience, style, setIndex } = params;
  const emojis = ['✨', '🔥', '💕', '🌟', '👀', '💯'];
  const variant = setIndex ? `第${setIndex}套·` : '';
  const angle = setIndex
    ? ['实测开箱', '使用心得', '对比测评', '场景种草', '细节实拍'][Number(setIndex) % 5]
    : '必看种草';

  const title = `${emojis[Math.floor(Math.random() * emojis.length)]} ${variant}${productName}｜${sellingPoints?.slice(0, 12) || angle}！`;

  const content =
    `姐妹们！今天必须给你们安利这个${productName}！🌱✨\n\n` +
    `作为一个${targetAudience || '资深用户'}，我真的被它惊艳到了！👀💕\n\n` +
    `${sellingPoints || '品质超赞，性价比超高 🔥'}\n\n` +
    `✅ ${productType || '好物'}中的佼佼者 🌟\n` +
    `✅ 适合${targetAudience || '所有人'}使用 💚\n` +
    `✅ ${style || '种草'}风格，真实体验 📸\n\n` +
    `用过的人都说好，赶紧冲！💯🔥`;

  const tags = [
    productName,
    productType || '好物推荐',
    '种草',
    targetAudience || '生活好物',
    '必买清单',
  ].filter(Boolean);

  return { title, content, tags };
}

/**
 * 调用 AI API 生成文案
 * @returns {{ title, content, tags, _meta?: { mock: boolean, reason?: string } }}
 */
async function generateCopy(params) {
  const aiConfig = getAiConfig();
  const { imagePaths, imageDataUrls, ...textParams } = params;

  if (aiConfig.forceMock || !aiConfig.url) {
    if (!aiConfig.url) logger.info('AI API 未配置，使用本地模拟生成');
    else logger.info('AI_FORCE_MOCK 已开启，使用本地模拟生成');
    await new Promise((r) => setTimeout(r, 800));
    return {
      ...generateMockCopy(textParams),
      _meta: { mock: true, reason: aiConfig.url ? 'force_mock' : 'not_configured' },
    };
  }

  try {
    const prompt = buildPrompt(textParams);
    const headers = {
      'Content-Type': 'application/json',
      ...(aiConfig.headers || {}),
    };

    if (aiConfig.apiKey) {
      headers.Authorization = `Bearer ${aiConfig.apiKey}`;
    }

    const requestBody = {
      model: aiConfig.model || 'deepseek-chat',
      messages: [{ role: 'user', content: prompt }],
      ...(aiConfig.extraParams || {}),
    };

    if (imagePaths && imagePaths.length > 0 && aiConfig.supportVision) {
      const parts = [{ type: 'text', text: prompt }];
      for (const p of imagePaths.slice(0, 3)) {
        if (!fs.existsSync(p)) continue;
        const buf = fs.readFileSync(p);
        const ext = path.extname(p).toLowerCase();
        const mime =
          ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
        parts.push({
          type: 'image_url',
          image_url: { url: `data:${mime};base64,${buf.toString('base64')}` },
        });
      }
      if (parts.length > 1) requestBody.messages[0].content = parts;
    } else if (imageDataUrls && imageDataUrls.length > 0 && aiConfig.supportVision) {
      const parts = [{ type: 'text', text: prompt }];
      for (const dataUrl of imageDataUrls.slice(0, 3)) {
        if (!String(dataUrl).startsWith('data:image/')) continue;
        parts.push({
          type: 'image_url',
          image_url: { url: dataUrl },
        });
      }
      if (parts.length > 1) requestBody.messages[0].content = parts;
    }

    logger.info(`调用 DeepSeek 生成文案 model=${aiConfig.model || 'deepseek-chat'}`);
    const response = await axios.post(aiConfig.url, requestBody, {
      headers,
      timeout: 60000,
    });

    const rawContent =
      response.data?.choices?.[0]?.message?.content ||
      response.data?.content ||
      response.data?.result ||
      response.data;

    const parsed = parseAiResponse(rawContent);
    if (parsed) {
      return { ...parsed, _meta: { mock: false } };
    }

    logger.warn('AI 返回格式无法解析，降级到模拟生成');
    return {
      ...generateMockCopy(textParams),
      _meta: { mock: true, reason: 'parse_failed' },
    };
  } catch (error) {
    const detail = extractApiError(error);
    const status = error.response?.status;
    logger.error(`AI API 调用失败 [${status || 'network'}]:`, detail);

    if (aiConfig.fallbackMock) {
      logger.warn('已自动降级为本地模拟文案');
      return {
        ...generateMockCopy(textParams),
        _meta: { mock: true, reason: detail, apiStatus: status },
      };
    }

    throw new Error(`AI 文案生成失败: ${detail}`);
  }
}

/**
 * 基于 ABC 套装 + 热门种草结构生成文案（读图 + 热榜套路）
 */
async function generateAbcViralCopy(params) {
  const aiConfig = getAiConfig();
  const { imageDataUrls, imagePaths, ...rest } = params;
  const prompt = buildAbcViralPrompt(rest);

  if (aiConfig.forceMock || !aiConfig.url) {
    await new Promise((r) => setTimeout(r, 600));
    return {
      ...buildMockAbcCopy(rest),
      _meta: { mock: true, reason: aiConfig.url ? 'force_mock' : 'not_configured' },
    };
  }

  try {
    const headers = {
      'Content-Type': 'application/json',
      ...(aiConfig.headers || {}),
    };
    if (aiConfig.apiKey) headers.Authorization = `Bearer ${aiConfig.apiKey}`;

    const requestBody = {
      model: aiConfig.model || 'deepseek-chat',
      messages: [{ role: 'user', content: prompt }],
      ...(aiConfig.extraParams || {}),
    };

    if (aiConfig.supportVision) {
      const parts = [{ type: 'text', text: prompt }];
      if (imageDataUrls?.length) {
        for (const dataUrl of imageDataUrls.slice(0, 3)) {
          if (String(dataUrl).startsWith('data:image/')) {
            parts.push({ type: 'image_url', image_url: { url: dataUrl } });
          }
        }
      } else if (imagePaths?.length) {
        for (const p of imagePaths.slice(0, 3)) {
          if (!fs.existsSync(p)) continue;
          const buf = fs.readFileSync(p);
          const ext = path.extname(p).toLowerCase();
          const mime =
            ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
          parts.push({
            type: 'image_url',
            image_url: { url: `data:${mime};base64,${buf.toString('base64')}` },
          });
        }
      }
      if (parts.length > 1) requestBody.messages[0].content = parts;
    }

    logger.info(`DeepSeek 生成 ABC 种草文案 model=${aiConfig.model || 'deepseek-chat'}`);
    const response = await axios.post(aiConfig.url, requestBody, {
      headers,
      timeout: 90000,
    });

    const rawContent =
      response.data?.choices?.[0]?.message?.content ||
      response.data?.content ||
      response.data?.result ||
      response.data;

    const parsed = parseAiResponse(rawContent);
    if (parsed) return { ...parsed, _meta: { mock: false } };

    return {
      ...buildMockAbcCopy(rest),
      _meta: { mock: true, reason: 'parse_failed' },
    };
  } catch (error) {
    const detail = extractApiError(error);
    logger.error('ABC 种草文案失败:', detail);
    if (aiConfig.fallbackMock) {
      return { ...buildMockAbcCopy(rest), _meta: { mock: true, reason: detail } };
    }
    throw new Error(`种草文案生成失败: ${detail}`);
  }
}

module.exports = { generateCopy, generateMockCopy, generateAbcViralCopy };
