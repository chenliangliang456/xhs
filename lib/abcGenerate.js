/**
 * ABC 套装生图 — 以 A 为锚点生成 B（五宫格）与 C（产品信息图）
 */
const { runSubmit, runPoll } = require('./generate');

function buildBPrompt(anchorPrompt, plantingMethod) {
  const base = String(anchorPrompt || '').trim();
  const method = String(plantingMethod || '').trim();
  const methodCell = method
    ? `第 5 格（右下角）：展示「${method}」种植/使用方法的步骤示意，仍须与参考图为同一产品/主题，步骤清晰易懂；`
    : '第 5 格（右下角）：展示种植或使用方法的步骤示意，仍须与参考图为同一产品/主题；';
  return [
    `【产品锚点】${base}`,
    '【硬性要求】必须与参考图（锚点 A）中的产品是同一款、同一包装、同一颜色、同一外观，禁止更换产品、款式或主体。',
    '严格以参考图为产品标准，生成一张小红书五宫格拼图（上排 2 格、下排 3 格，白边均匀分隔）：',
    '第 1 格（左上）：参考图同款产品正面角度；',
    '第 2 格（右上）：参考图同款产品侧面角度；',
    '第 3 格（左下）：参考图同款产品 45° 或俯拍角度；',
    '第 4 格（中下）：参考图同款产品细节特写（材质/纹理/局部）；',
    methodCell,
    '五格中的产品必须与参考图完全一致，仅拍摄角度不同；整体色调、光影、背景风格与 A 图统一；',
    '高清电商质感，画面干净，无文字、无水印、无 logo。',
  ].join('');
}

function buildCPrompt(anchorPrompt, productDimensions, productInfo) {
  const base = String(anchorPrompt || '').trim();
  const dims = String(productDimensions || '').trim() || '未指定';
  const info = String(productInfo || '').trim() || '未指定';
  return [
    `【产品锚点】${base}`,
    '【硬性要求】必须与参考图（锚点 A）中的产品是同一款、同一包装、同一颜色、同一外观，禁止换产品。',
    '严格以参考图为产品标准，生成一张小红书产品信息详情图（竖版）：',
    '主视觉区：参考图同款产品的大图主图（hero shot），产品外观、颜色、材质与 A 图完全一致；',
    '信息区：在画面下方或右侧留出清晰排版区域，展示以下产品信息（中文清晰可读）：',
    `—— 产品尺寸：${dims}`,
    `—— 产品信息：${info}`,
    '版式简洁高级，适合小红书详情页；主图与信息区层次分明；高清，无多余水印。',
  ].join('');
}

function parseDataUrl(dataUrl) {
  const str = String(dataUrl || '');
  const match = str.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  return { mime: match[1], base64: match[2] };
}

/**
 * 提交 B + C 生成任务
 * @param {object} body - { anchorPrompt, anchorDataUrl?, productDimensions, productInfo, plantingMethod?, size?, setIndex? }
 */
async function runGenerateAbcSet(body) {
  const anchorPrompt = String(body.anchorPrompt || '').trim();
  if (!anchorPrompt) {
    const err = new Error('缺少锚点描述，请确保锚点图带有原始提示词');
    err.status = 400;
    throw err;
  }

  const productDimensions = String(body.productDimensions || '').trim();
  const productInfo = String(body.productInfo || '').trim();
  if (!productDimensions && !productInfo) {
    const err = new Error('请填写产品尺寸或产品信息（C 图需要）');
    err.status = 400;
    throw err;
  }

  const size = body.size || '1:1';
  const setIndex = body.setIndex || Date.now().toString().slice(-4);
  const batchId =
    String(body.batchId || '').trim() ||
    `abc${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}`;

  const bPrompt = buildBPrompt(anchorPrompt, body.plantingMethod);
  const cPrompt = buildCPrompt(anchorPrompt, productDimensions, productInfo);

  const anchorImage = parseDataUrl(body.anchorDataUrl);
  const referenceImage =
    body.anchorDataUrl ||
    (anchorImage ? `data:${anchorImage.mime};base64,${anchorImage.base64}` : undefined);

  const bSubmit = await runSubmit({
    prompt: bPrompt,
    count: 1,
    size,
    startId: 1,
    batchId: `${batchId}_b`,
    referenceImage,
  });

  const cSubmit = await runSubmit({
    prompt: cPrompt,
    count: 1,
    size: body.cSize || '3:4',
    startId: 2,
    batchId: `${batchId}_c`,
    referenceImage,
  });

  const bTask = bSubmit.tasks[0];
  const cTask = cSubmit.tasks[0];

  return {
    batchId,
    setIndex,
    anchorPrompt,
    tasks: [
      {
        ...bTask,
        role: 'b',
        label: 'B · 五宫格',
        prompt: bPrompt,
        setIndex,
        batchId: `${batchId}_b`,
      },
      {
        ...cTask,
        role: 'c',
        label: 'C · 产品信息图',
        prompt: cPrompt,
        setIndex,
        batchId: `${batchId}_c`,
      },
    ],
  };
}

module.exports = {
  buildBPrompt,
  buildCPrompt,
  runGenerateAbcSet,
};
