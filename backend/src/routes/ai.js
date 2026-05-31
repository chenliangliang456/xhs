/**
 * AI 文案生成路由
 */
const express = require('express');
const { generateCopy, generateAbcViralCopy } = require('../services/ai');
const { authMiddleware } = require('../middleware/auth');
const { resolveImagePaths } = require('../utils/imagePaths');

const router = express.Router();
router.use(authMiddleware);

/**
 * POST /api/ai/generate - 生成小红书文案和标签
 */
router.post('/generate', async (req, res) => {
  try {
    const {
      productName,
      sellingPoints,
      productType,
      targetAudience,
      style,
      imageFilenames,
      imageSources,
    } = req.body;

    if (!productName) {
      return res.status(400).json({ success: false, message: '请输入产品名称' });
    }

    const sources = imageSources?.length
      ? imageSources
      : (imageFilenames || []).map((f) => ({ source: 'upload', filename: f }));

    const imagePaths = resolveImagePaths(sources);

    const result = await generateCopy({
      productName,
      sellingPoints: sellingPoints || '',
      productType: productType || '',
      targetAudience: targetAudience || '',
      style: style || '',
      imagePaths,
    });

    const { _meta, ...copy } = result;
    const isMock = _meta?.mock;
    let message = '文案生成成功';
    if (isMock) {
      const reason = _meta?.reason || '';
      if (/balance|余额|insufficient|402|401|invalid.*key/i.test(String(reason))) {
        message = 'DeepSeek 余额不足或密钥无效，已使用本地模拟文案（请充值或更新 AI_API_KEY）';
      } else if (reason === 'not_configured') {
        message = '未配置 AI API，已使用本地模拟文案';
      } else {
        message = `AI 接口暂不可用，已使用本地模拟文案${reason ? `（${reason}）` : ''}`;
      }
    }

    res.json({
      success: true,
      data: copy,
      meta: _meta,
      message,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/ai/generate-viral
 * 与定时发布中的 AI 文案逻辑一致（generateCopy + 套装编号/配图提示），仅用于独立「爆款文案」页，不影响定时发布代码路径。
 */
router.post('/generate-viral', async (req, res) => {
  try {
    const {
      productName,
      sellingPoints,
      productType,
      targetAudience,
      style,
      imageFilenames,
      imageSources,
      setIndex: setIndexBody,
    } = req.body;

    if (!productName) {
      return res.status(400).json({ success: false, message: '请输入产品名称' });
    }

    const sources = imageSources?.length
      ? imageSources
      : (imageFilenames || []).map((f) => ({ source: 'upload', filename: f }));

    const imagePaths = resolveImagePaths(sources);

    const setIndex =
      setIndexBody != null && String(setIndexBody).trim() !== ''
        ? String(setIndexBody).trim()
        : undefined;

    const variantHint = setIndex
      ? `请根据本套 a${setIndex}/b${setIndex}/c${setIndex} 配图内容创作，标题、正文、5个标签均需新颖独特，不得与其他套装雷同。`
      : undefined;

    const result = await generateCopy({
      productName,
      sellingPoints: sellingPoints || '',
      productType: productType || '',
      targetAudience: targetAudience || '',
      style: style || '',
      imagePaths,
      setIndex,
      variantHint,
    });

    const { _meta, ...copy } = result;
    const isMock = _meta?.mock;
    let message = '爆款文案生成成功';
    if (isMock) {
      const reason = _meta?.reason || '';
      if (/balance|余额|insufficient|402|401|invalid.*key/i.test(String(reason))) {
        message = 'DeepSeek 余额不足或密钥无效，已使用本地模拟文案（请充值或更新 AI_API_KEY）';
      } else if (reason === 'not_configured') {
        message = '未配置 AI API，已使用本地模拟文案';
      } else {
        message = `AI 接口暂不可用，已使用本地模拟文案${reason ? `（${reason}）` : ''}`;
      }
    }

    res.json({
      success: true,
      data: copy,
      meta: _meta,
      message,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/ai/generate-abc-copy
 * 根据 ABC 套装配图 + 产品信息 + 小红书热门种草结构，生成标题/正文/标签
 */
router.post('/generate-abc-copy', async (req, res) => {
  try {
    const {
      setIndex,
      productCategory,
      productInfo,
      productDimensions,
      genTags,
      designPrompt,
      styleKey,
      imageDataUrls,
      imageSources,
    } = req.body;

    if (!setIndex) {
      return res.status(400).json({ success: false, message: '缺少套装编号' });
    }
    if (!productCategory && !productInfo) {
      return res.status(400).json({ success: false, message: '请提供产品分类或产品信息' });
    }

    const sources = imageSources?.length ? imageSources : [];
    const imagePaths = sources.length ? resolveImagePaths(sources) : [];

    const result = await generateAbcViralCopy({
      setIndex: String(setIndex),
      productCategory: productCategory || '',
      productInfo: productInfo || '',
      productDimensions: productDimensions || '',
      genTags: genTags || '',
      designPrompt: designPrompt || '',
      styleKey: styleKey || '',
      imageDataUrls: Array.isArray(imageDataUrls) ? imageDataUrls : undefined,
      imagePaths,
    });

    const { _meta, ...copy } = result;
    const isMock = _meta?.mock;
    let message = 'DeepSeek 热门种草文案生成成功';
    if (isMock) {
      message = isMock && _meta?.reason === 'not_configured'
        ? '未配置 DeepSeek API，已使用热门结构模板文案（请在 backend/.env 填写 AI_API_URL 与 AI_API_KEY）'
        : `DeepSeek 暂不可用，已使用热门结构模板文案${_meta?.reason ? `（${_meta.reason}）` : ''}`;
    }

    res.json({
      success: true,
      data: copy,
      meta: _meta,
      message,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
