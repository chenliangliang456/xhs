/** 出图选项 — 颜色 / 形状 / 风格（前后端共用逻辑） */

const COLOR_OPTIONS = [
  { id: 'white', label: '白色', prompt: '整款为纯白色种子纸，纸面干净明亮、纤维质感清晰' },
  { id: 'black', label: '黑色', prompt: '整款为纯黑色种子纸，纸面深邃高级、纤维质感清晰' },
  { id: 'random', label: '随机混色', prompt: '' },
];

const REGULAR_SHAPES = [
  { id: 'rectangle', label: '长方形', prompt: '标准长方形裁切轮廓，边缘整齐' },
  { id: 'square', label: '正方形', prompt: '标准正方形裁切轮廓，边缘整齐' },
];

const IRREGULAR_SHAPES = [
  { id: 'circle', label: '圆形', prompt: '圆形异形裁切，流畅曲线轮廓' },
  { id: 'star', label: '五角星', prompt: '五角星异形裁切，星形轮廓清晰' },
  { id: 'trapezoid', label: '梯形', prompt: '梯形异形裁切，几何感轮廓' },
  { id: 'irregular', label: '不规则', prompt: '不规则有机异形裁切，手作感自然边缘' },
];

const STYLE_OPTIONS = [
  { id: 'luxury', label: '高级感', prompt: '高级轻奢质感，精致排版，低饱和度，电商大片感' },
  { id: 'ins', label: 'INS风', prompt: 'INS 北欧极简风，柔和自然光，莫兰迪配色' },
  { id: 'cute', label: '可爱风', prompt: '可爱治愈风，柔和粉嫩配色，圆润元素' },
  { id: 'chinese', label: '国潮风', prompt: '国潮新中式，传统纹样点缀，红金配色' },
  { id: 'minimal', label: '极简风', prompt: '极简留白，干净克制，大面积纯色背景' },
  { id: 'vintage', label: '复古风', prompt: '复古胶片质感，做旧纸纹，暖色调' },
  { id: 'fresh', label: '清新风', prompt: '清新自然，绿植点缀，明亮通透' },
  { id: 'artistic', label: '文艺风', prompt: '文艺手作感，手写体点缀，牛皮纸质感' },
  { id: 'random', label: '随机风格', prompt: '' },
];

/** C 图叠加文字颜色 */
const TEXT_COLOR_OPTIONS = [
  { id: 'black', label: '黑色', prompt: '叠加文字须为纯黑色，对比清晰、易读' },
  { id: 'white', label: '白色', prompt: '叠加文字须为纯白色，可加轻微阴影保证可读' },
  { id: 'red', label: '红色', prompt: '叠加文字须为小红书经典红色（#FF2442 色系），醒目吸睛' },
  { id: 'blue', label: '蓝色', prompt: '叠加文字须为深蓝色或天蓝色，清爽专业' },
];

/** C 图叠加文字字体 */
const FONT_OPTIONS = [
  { id: 'sans', label: '现代黑体', prompt: '现代无衬线黑体（思源黑体/苹方风格），简洁利落' },
  { id: 'song', label: '宋体', prompt: '宋体/明朝体，传统正式、典雅端庄' },
  { id: 'hei', label: '粗黑体', prompt: '粗黑体标题字，字重高、冲击力强' },
  { id: 'kai', label: '楷体', prompt: '楷体书法感，端正温润' },
  { id: 'handwritten', label: '手写体', prompt: '自然手写体，闺蜜种草分享感' },
  { id: 'round', label: '圆体', prompt: '圆体/幼圆风格，可爱圆润、亲和力强' },
];

const ALL_SHAPES = [...REGULAR_SHAPES, ...IRREGULAR_SHAPES];
const PICKABLE_COLORS = COLOR_OPTIONS.filter((c) => c.id !== 'random');
const PICKABLE_STYLES = STYLE_OPTIONS.filter((s) => s.id !== 'random');

function pickBySeed(list, seed) {
  if (!list.length) return null;
  const n = Math.abs(Number(seed) || 0);
  return list[n % list.length];
}

function hashSlot(seed, index) {
  const s = Number(seed);
  if (Number.isFinite(s) && s > 0) return s + index * 9973;
  return index * 7919 + 13;
}

function resolveColorOption(colorKey, slotIndex, seed) {
  if (colorKey === 'random') {
    const h = hashSlot(seed, slotIndex);
    return pickBySeed(PICKABLE_COLORS, h);
  }
  return COLOR_OPTIONS.find((c) => c.id === colorKey) || PICKABLE_COLORS[0];
}

function resolveShapeOption(shapeCategory, shapeKey, slotIndex, seed) {
  const pool =
    shapeKey === 'random'
      ? ALL_SHAPES
      : shapeCategory === 'irregular'
        ? IRREGULAR_SHAPES
        : REGULAR_SHAPES;

  if (shapeKey === 'random') {
    const h = hashSlot(seed, slotIndex + 101);
    return pickBySeed(pool, h);
  }

  const found = ALL_SHAPES.find((s) => s.id === shapeKey);
  if (found) return found;
  return shapeCategory === 'irregular' ? IRREGULAR_SHAPES[0] : REGULAR_SHAPES[0];
}

function resolveStyleOption(styleKey, slotIndex, seed) {
  if (styleKey === 'random') {
    const h = hashSlot(seed, slotIndex + 202);
    return pickBySeed(PICKABLE_STYLES, h);
  }
  return STYLE_OPTIONS.find((s) => s.id === styleKey) || STYLE_OPTIONS[0];
}

function resolveTextColorOption(textColorKey) {
  return TEXT_COLOR_OPTIONS.find((c) => c.id === textColorKey) || TEXT_COLOR_OPTIONS[0];
}

function resolveFontOption(fontKey) {
  return FONT_OPTIONS.find((f) => f.id === fontKey) || FONT_OPTIONS[0];
}

/** 解析单张图的出图修饰（含随机） */
function resolveGenModifiers(options = {}, slotIndex = 0, seed = 0) {
  const color = resolveColorOption(options.colorKey || 'white', slotIndex, seed);
  const shape = resolveShapeOption(
    options.shapeCategory || 'regular',
    options.shapeKey || 'rectangle',
    slotIndex,
    seed
  );
  const style = resolveStyleOption(options.styleKey || 'luxury', slotIndex, seed);
  const textColor = resolveTextColorOption(options.textColorKey || 'black');
  const font = resolveFontOption(options.fontKey || 'sans');

  return {
    colorKey: color?.id,
    colorLabel: color?.label,
    shapeKey: shape?.id,
    shapeLabel: shape?.label,
    shapeCategory: options.shapeCategory || 'regular',
    styleKey: style?.id,
    styleLabel: style?.label,
    textColorKey: textColor?.id,
    textColorLabel: textColor?.label,
    fontKey: font?.id,
    fontLabel: font?.label,
    colorPrompt: color?.prompt || '',
    shapePrompt: shape?.prompt || '',
    stylePrompt: style?.prompt || '',
    textColorPrompt: textColor?.prompt || '',
    fontPrompt: font?.prompt || '',
  };
}

function buildPromptSuffix(modifiers) {
  const parts = [];
  if (modifiers.colorPrompt) parts.push(modifiers.colorPrompt);
  if (modifiers.shapePrompt) parts.push(modifiers.shapePrompt);
  if (modifiers.stylePrompt) parts.push(modifiers.stylePrompt);
  if (!parts.length) return '';
  return `【出图要求】${parts.join('；')}；`;
}

function buildFullPrompt(basePrompt, modifiers) {
  const base = String(basePrompt || '').trim();
  const suffix = buildPromptSuffix(modifiers);
  if (!suffix) return base;
  return `${base}\n${suffix}`;
}

function buildCreativeCOverlayHints(stylePrompt) {
  const style = stylePrompt ? `整体视觉风格：${stylePrompt}；` : '';
  return [
    '以锚点 A 图为主体进行二次创作（C 图必须基于 A 锚点图改版，不可换产品）：',
    '在完整保留 A 图产品形态、轮廓、主色的基础上，增加小红书爆款详情页级视觉二创——',
    '精致角标/贴边尺寸标注、半透明磨砂信息卡片、手写感小字、纸纤维纹理增强、',
    '种子/绿植微元素装饰线、轻微光晕或渐变底条，让信息层更丰富美观但不遮挡主体；',
    style,
    '禁止改成上下分栏详情页，禁止换背景场景，产品仍是画面绝对主角。',
  ].join('');
}

function buildCTextStyleHints(textColorPrompt, fontPrompt) {
  const parts = [];
  if (textColorPrompt) parts.push(textColorPrompt);
  if (fontPrompt) parts.push(`字体须为${fontPrompt}`);
  if (!parts.length) return '';
  return `【C 图文字样式】${parts.join('；')}；所有叠加中文（分类、尺寸、产品信息）须统一使用该颜色与字体。`;
}

module.exports = {
  COLOR_OPTIONS,
  REGULAR_SHAPES,
  IRREGULAR_SHAPES,
  STYLE_OPTIONS,
  TEXT_COLOR_OPTIONS,
  FONT_OPTIONS,
  ALL_SHAPES,
  resolveGenModifiers,
  buildFullPrompt,
  buildPromptSuffix,
  buildCreativeCOverlayHints,
  buildCTextStyleHints,
};
