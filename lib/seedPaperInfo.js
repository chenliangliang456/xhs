/** 种子纸 — B 反面种植 / C 全面信息（前后端共用文案源） */

const COMPOSITION = '甘蔗浆、竹浆、木浆';
const FEATURES = '环保可降解，只内嵌入种植植物种子';

const DEFAULT_PLANTING_STEPS = [
  '① 撕碎或整片浸泡温水 2～4 小时',
  '② 埋入湿润疏松土壤，覆土约 0.5cm',
  '③ 放置通风散光处，每日喷雾保持湿润',
  '④ 7～15 天萌芽，持续轻量养护',
].join('；');

const PLANTING_TIPS = [
  '避强光暴晒，忌积水',
  '春秋季种植成功率更高',
  '可用浅盆/花槽/户外土壤',
  '发芽后适当见光',
].join('；');

function buildBreakdownAnnotations(productCategory, productDimensions) {
  const category = String(productCategory || '种子纸').trim();
  const dims = String(productDimensions || '').trim() || '见标注';
  return [
    { key: '材质', value: COMPOSITION },
    { key: '特性', value: FEATURES },
    { key: '印刷', value: '活字印刷 / 活版印刷 / 数码印刷，纸内嵌入可种植植物种子' },
    { key: '规格', value: dims },
    { key: '品类', value: category },
    { key: '种植', value: DEFAULT_PLANTING_STEPS },
    { key: '技巧', value: PLANTING_TIPS },
    { key: '保存', value: '干燥避光，常温保存' },
  ];
}

function formatBreakdownAnnotations(productCategory, productDimensions) {
  return buildBreakdownAnnotations(productCategory, productDimensions)
    .map(({ key, value }) => `「${key}」${value}`)
    .join('；');
}

function buildFullSeedPaperInfo(productCategory, productDimensions, baseInfo) {
  const category = String(productCategory || '种子纸').trim();
  const dims = String(productDimensions || '').trim();
  const lines = [
    '【产品名称】种子纸',
    `【产品分类】${category}`,
    dims ? `【产品尺寸】${dims}` : '',
    `【核心成分】${COMPOSITION}`,
    `【产品特性】${FEATURES}`,
    '【环保价值】可自然降解，减少一次性垃圾，支持可持续生活',
    '【适用场景】服装吊牌、邀请函、明信片、门票、展会物料等',
    `【种植方法】${DEFAULT_PLANTING_STEPS}`,
    `【种植技巧】${PLANTING_TIPS}`,
    '【储存建议】干燥避光，常温保存',
  ].filter(Boolean);

  const base = String(baseInfo || '').trim();
  if (base && !base.includes('种植方法')) {
    lines.push(`【补充说明】${base.replace(/\n/g, '；')}`);
  }
  return lines.join('\n');
}

module.exports = {
  COMPOSITION,
  FEATURES,
  DEFAULT_PLANTING_STEPS,
  PLANTING_TIPS,
  buildFullSeedPaperInfo,
  buildBreakdownAnnotations,
  formatBreakdownAnnotations,
};
