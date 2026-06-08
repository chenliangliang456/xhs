/**
 * ABC 套装生图 — 以 A 为锚点生成 B（多宫格）与 C（原图叠加产品信息）
 */
const { runSubmit, runPoll } = require('./generate');
const { getGridLayout, normalizeGridCount, resolveBGridCount } = require('./bGridLayouts');
const { buildCreativeCOverlayHints, buildCreativeCBreakdownHints, buildCTextStyleHints, resolveGenModifiers } = require('./promptModifiers');
const {
  DEFAULT_PLANTING_STEPS,
  PLANTING_TIPS,
  formatBreakdownAnnotations,
} = require('./seedPaperInfo');

function buildPlantingCellPrompt(plantingMethod, cellNum) {
  const custom = String(plantingMethod || '').trim();
  const scene = custom
    ? `展示「${custom}」的真实种植/使用步骤`
    : '展示种子纸真实种植教程（湿润土壤、埋入纸片、浇水、小芽萌发）';
  return [
    `第 ${cellNum} 格：${scene}；`,
    '必须是真实感极强的实拍风格（像手机近景拍摄），自然光、真实土壤与手部动作，',
    '步骤清晰、质感真实，禁止卡通插画、禁止扁平图标；',
    '可与参考图产品同主题，但该格重点是种植/使用场景而非产品棚拍。',
  ].join('');
}

function buildFrontBackBPrompt(anchorPrompt, options = {}) {
  const base = String(anchorPrompt || '').trim();
  const category = String(options.productCategory || '').trim();
  const styleHint = String(options.stylePrompt || '').trim();
  const customPlanting = String(options.plantingMethod || '').trim();
  const plantingSteps = customPlanting || DEFAULT_PLANTING_STEPS;
  const categoryLine = category
    ? `【产品分类】${category}，须体现环保种子纸质感；`
    : '';

  return [
    `【产品锚点】${base}`,
    categoryLine,
    styleHint ? `【视觉风格】${styleHint}；` : '',
    '【B 图模式：正反面场景实拍】生成一张完整的场景实拍图（单帧摄影，不是拼图、不是二宫格、不是左右分栏）：',
    '【硬性禁止】左右分栏、竖线分割、等宽双面板、宫格拼图、白边分格、拼接边框、左右两张图并排；',
    '【构图参考】同一张画面内，两张同款种子纸卡片自然摆放：一张展示正面、一张展示反面/背面，可斜靠、微交叠、一前一后，像高端婚礼/电商场景实拍；',
    '正面卡：与锚点 A 完全同款（同一包装、颜色、主设计），纸纤维与种子质感清晰；',
    '反面卡：同款背面，清晰展示「种植方法与技巧」印刷排版：',
    `· 种植步骤：${plantingSteps}；`,
    `· 种植技巧：${PLANTING_TIPS}；`,
    '反面须有清晰可读的中文步骤序号或小图标，像真实印刷背面，禁止纯空白；',
    '背景、道具、色调、光影须与锚点 A 图同场景延续（同布料/花材/环境），禁止换背景、禁止大面积留白；',
    '整体一张图、真实摄影质感、高清无水印。',
  ].join('');
}

function buildBPrompt(anchorPrompt, options = {}) {
  if (options.bFeatureMode === 'frontBack') {
    return buildFrontBackBPrompt(anchorPrompt, options);
  }

  const base = String(anchorPrompt || '').trim();
  const category = String(options.productCategory || '').trim();
  const styleHint = String(options.stylePrompt || '').trim();
  const gridCount = resolveBGridCount({
    mode: options.bGridMode,
    count: options.bGridCount,
    customCount: options.bGridCustomCount,
    setIndex: options.setIndex,
    seed: options.seed,
  });
  const layout = getGridLayout(gridCount, options.bGridCustomLayout);
  const enablePlanting = !!options.enablePlantingMethod;
  const plantingCell = layout.plantingCell;

  const categoryLine = category
    ? category.includes('种子纸')
      ? `【产品分类】${category}，须体现环保种子纸质感、纸纤维与嵌入种子的细节；`
      : `【产品分类】${category}，宫格展示须符合该品类印刷/物料的视觉与排版习惯；`
    : '';

  const cellLines = layout.cells.map((cell) => {
    if (enablePlanting && cell.n === plantingCell) {
      return buildPlantingCellPrompt(options.plantingMethod, cell.n);
    }
    return `第 ${cell.n} 格：${cell.desc}；`;
  });

  return [
    `【产品锚点】${base}`,
    categoryLine,
    styleHint ? `【视觉风格】${styleHint}；` : '',
    '【硬性要求】除种植/方法格外，其余格必须与参考图（锚点 A）中的产品是同一款、同一包装、同一颜色、同一外观，禁止更换产品。',
    `严格以参考图为产品标准，生成一张小红书 ${layout.label}拼图（${layout.layoutDesc}，白边均匀分隔）：`,
    ...cellLines,
    '非种植格中的产品必须与参考图完全一致，仅拍摄角度不同；整体色调、光影、背景风格与 A 图统一；',
    '高清电商质感，画面干净，无文字、无水印、无 logo。',
  ].join('');
}

function buildCPrompt(anchorPrompt, productDimensions, productInfo, productCategory, options = {}) {
  const base = String(anchorPrompt || '').trim();
  const dims = String(productDimensions || '').trim() || '未指定';
  const category = String(productCategory || '').trim() || '未指定';
  const isFull = options.cFeatureMode === 'fullInfo';
  const info = isFull
    ? formatBreakdownAnnotations(category, dims)
    : String(productInfo || '').trim() || '未指定';
  const seedPaperExtra =
    !isFull &&
    /种子纸|吊牌|胸卡|邀请函|门票|明信片|甘蔗浆/.test(category + info) &&
    !info.includes('甘蔗浆')
      ? '；成分须标注：甘蔗浆、竹浆、木浆'
      : '';
  const creative = isFull
    ? buildCreativeCBreakdownHints(options.stylePrompt)
    : buildCreativeCOverlayHints(options.stylePrompt);
  const textStyle = buildCTextStyleHints(options.textColorPrompt, options.fontPrompt);

  if (isFull) {
    return [
      `【产品锚点】${base}`,
      '【硬性要求】C 图必须基于锚点 A 参考图，产品是同一款、同一包装、同一颜色、同一外观；画面中央只有这一张种子纸，禁止换产品、禁止出现第二张产品。',
      '【背景要求】背景须与锚点 A 图完全一致（同场景、同色调、同光影、同材质），禁止大面积留白、禁止换背景、禁止纯白底；',
      creative,
      textStyle,
      '【C 图模式：活字印刷视觉拆解】印刷工艺须体现活字印刷、活版印刷或数码印刷质感（铅字压印、轻微油墨凹凸、纸纤维吃墨感）；',
      '用极细引导线从中心产品向四周延伸，每条线末端标注以下信息（全部中文，短标签形式，活字排版感，不可写成大段说明书）：',
      info,
      '标注分散在四周，与锚点背景自然融合，线条细、标签小、层次清晰；禁止信息海报/说明书式满版文字；高清无水印。',
    ].join('');
  }

  return [
    `【产品锚点】${base}`,
    '【硬性要求】C 图必须直接基于锚点 A 参考图改版，产品是同一款、同一包装、同一颜色、同一外观，禁止换产品。',
    creative,
    textStyle,
    '在同一张锚点原图上叠加精致美观的中文产品信息：',
    `· 产品分类：${category}`,
    `· 产品尺寸（须在 C 图上清晰展示）：${dims}`,
    `· 产品信息：${info}${seedPaperExtra}`,
    '排版要求：尺寸用 elegant 角标贴边；信息用半透明卡片/标签自然融入；文字清晰可读不遮挡主体；高清无水印。',
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
 * @param {object} body
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
  const productCategory = String(body.productCategory || '').trim();
  const bGridCount =
    body.bFeatureMode === 'frontBack'
      ? 2
      : resolveBGridCount({
          mode: body.bGridMode,
          count: body.bGridCount,
          customCount: body.bGridCustomCount,
          setIndex: body.setIndex,
          seed: body.seed,
        });

  if (!productCategory) {
    const err = new Error('请选择产品分类');
    err.status = 400;
    throw err;
  }
  if (!productDimensions) {
    const err = new Error('请填写产品尺寸（将显示在 C 图）');
    err.status = 400;
    throw err;
  }
  if (!productInfo) {
    const err = new Error('请填写产品信息（C 图需要）');
    err.status = 400;
    throw err;
  }

  const size = body.size || '1:1';
  const setIndex = body.setIndex || Date.now().toString().slice(-4);
  const batchId =
    String(body.batchId || '').trim() ||
    `abc${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}`;

  const textMods = resolveGenModifiers({
    textColorKey: body.textColorKey,
    fontKey: body.fontKey,
  });

  const bOptions = {
    bFeatureMode: body.bFeatureMode || 'frontBack',
    productCategory,
    bGridMode: body.bGridMode,
    bGridCount: body.bGridCount,
    bGridCustomCount: body.bGridCustomCount,
    bGridCustomLayout: body.bGridCustomLayout,
    setIndex: body.setIndex,
    seed: body.seed,
    enablePlantingMethod: !!body.enablePlantingMethod,
    plantingMethod: body.plantingMethod,
    stylePrompt: body.stylePrompt || '',
  };

  const bPrompt = buildBPrompt(anchorPrompt, bOptions);
  const cPrompt = buildCPrompt(
    anchorPrompt,
    productDimensions,
    productInfo,
    productCategory,
    {
      cFeatureMode: body.cFeatureMode || 'fullInfo',
      stylePrompt: body.stylePrompt || '',
      textColorPrompt: textMods.textColorPrompt,
      fontPrompt: textMods.fontPrompt,
    }
  );
  const gridLayout = getGridLayout(bGridCount, body.bGridCustomLayout);
  const bLabel =
    body.bFeatureMode === 'frontBack'
      ? 'B · 正反面场景实拍'
      : `B · ${gridLayout.label}${body.enablePlantingMethod ? ' · 含种植格' : ''}`;

  const anchorImage = parseDataUrl(body.anchorDataUrl);
  const referenceImage =
    body.anchorDataUrl ||
    (anchorImage ? `data:${anchorImage.mime};base64,${anchorImage.base64}` : undefined);

  const staggerMs = Number(body.submitStaggerMs) || 800;

  const bSubmit = await runSubmit({
    prompt: bPrompt,
    count: 1,
    size,
    startId: 1,
    batchId: `${batchId}_b`,
    referenceImage,
  });

  if (staggerMs > 0) {
    await new Promise((r) => setTimeout(r, staggerMs));
  }

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
    bGridCount,
    bFeatureMode: body.bFeatureMode || 'frontBack',
    cFeatureMode: body.cFeatureMode || 'fullInfo',
    bGridMode: body.bGridMode || 'preset',
    enablePlantingMethod: !!body.enablePlantingMethod,
    tasks: [
      {
        ...bTask,
        role: 'b',
        label: bLabel,
        prompt: bPrompt,
        setIndex,
        batchId: `${batchId}_b`,
      },
      {
        ...cTask,
        role: 'c',
        label:
          body.cFeatureMode === 'fullInfo' ? 'C · 活字印刷拆解' : 'C · 产品信息图',
        prompt: cPrompt,
        setIndex,
        batchId: `${batchId}_c`,
      },
    ],
  };
}

/** 仅重生成 C 图（基于已有 A 锚点） */
async function runGenerateCOnly(body) {
  const anchorPrompt = String(body.anchorPrompt || '').trim();
  if (!anchorPrompt) {
    const err = new Error('缺少锚点描述');
    err.status = 400;
    throw err;
  }

  const productDimensions = String(body.productDimensions || '').trim();
  const productInfo = String(body.productInfo || '').trim();
  const productCategory = String(body.productCategory || '').trim();

  if (!productCategory) {
    const err = new Error('请选择产品分类');
    err.status = 400;
    throw err;
  }
  if (!productDimensions) {
    const err = new Error('请填写产品尺寸');
    err.status = 400;
    throw err;
  }
  if (!productInfo) {
    const err = new Error('请填写产品信息');
    err.status = 400;
    throw err;
  }

  const setIndex = body.setIndex || Date.now().toString().slice(-4);
  const batchId =
    String(body.batchId || '').trim() ||
    `c${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}`;

  const textMods = resolveGenModifiers({
    textColorKey: body.textColorKey,
    fontKey: body.fontKey,
  });

  const cPrompt = buildCPrompt(
    anchorPrompt,
    productDimensions,
    productInfo,
    productCategory,
    {
      cFeatureMode: body.cFeatureMode || 'fullInfo',
      stylePrompt: body.stylePrompt || '',
      textColorPrompt: textMods.textColorPrompt,
      fontPrompt: textMods.fontPrompt,
    }
  );

  const anchorImage = parseDataUrl(body.anchorDataUrl);
  const referenceImage =
    body.anchorDataUrl ||
    (anchorImage ? `data:${anchorImage.mime};base64,${anchorImage.base64}` : undefined);

  const cSubmit = await runSubmit({
    prompt: cPrompt,
    count: 1,
    size: body.cSize || '3:4',
    startId: 1,
    batchId: `${batchId}_c`,
    referenceImage,
  });

  const cTask = cSubmit.tasks[0];

  return {
    batchId,
    setIndex,
    cFeatureMode: body.cFeatureMode || 'fullInfo',
    tasks: [
      {
        ...cTask,
        role: 'c',
        label:
          body.cFeatureMode === 'fullInfo' ? 'C · 活字印刷拆解' : 'C · 产品信息图',
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
  runGenerateCOnly,
};
