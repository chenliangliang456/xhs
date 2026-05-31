/** ABC 生成 — 产品分类预设 */
export const SEED_PAPER_CATEGORY_ID = 'seed-paper';

/** 种子纸默认成分（甘蔗浆、竹浆、木浆） */
export const SEED_PAPER_COMPOSITION = '甘蔗浆、竹浆、木浆';

export const SEED_PAPER_FEATURES = '环保可降解，只内嵌入种植植物种子';

/** 所有分类共用同一套产品信息（仅分类名、尺寸不同） */
export const UNIFIED_SEED_PAPER_INFO = [
  '产品：种子纸',
  `成分：${SEED_PAPER_COMPOSITION}`,
  `特性：${SEED_PAPER_FEATURES}`,
].join('\n');

export function buildSeedPaperProductInfo() {
  return UNIFIED_SEED_PAPER_INFO;
}

export const SEED_PAPER_DEFAULT_INFO = UNIFIED_SEED_PAPER_INFO;

export const PRODUCT_CATEGORIES = [
  {
    id: 'clothing-tag',
    label: '服装吊牌',
    defaultDimensions: '5cm × 8cm',
    defaultProductInfo: UNIFIED_SEED_PAPER_INFO,
  },
  {
    id: 'exhibition-badge',
    label: '展会胸卡',
    defaultDimensions: '9cm × 12cm',
    defaultProductInfo: UNIFIED_SEED_PAPER_INFO,
  },
  {
    id: 'wedding-invitation',
    label: '婚礼邀请函',
    defaultDimensions: '14.8cm × 21cm（A5）',
    defaultProductInfo: UNIFIED_SEED_PAPER_INFO,
  },
  {
    id: 'ticket',
    label: '门票',
    defaultDimensions: '8cm × 16cm',
    defaultProductInfo: UNIFIED_SEED_PAPER_INFO,
  },
  {
    id: 'postcard',
    label: '明信片',
    defaultDimensions: '10cm × 15cm',
    defaultProductInfo: UNIFIED_SEED_PAPER_INFO,
  },
  {
    id: SEED_PAPER_CATEGORY_ID,
    label: '种子纸',
    defaultDimensions: '10cm × 15cm',
    defaultProductInfo: UNIFIED_SEED_PAPER_INFO,
  },
];

export function getCategoryById(id) {
  return PRODUCT_CATEGORIES.find((c) => c.id === id) || null;
}

export function resolveProductCategory(form) {
  if (!form) return '';
  if (form.categoryKey === 'custom') return String(form.categoryCustom || '').trim();
  return getCategoryById(form.categoryKey)?.label || '';
}

export function isSeedPaperText(text) {
  return /种子纸|甘蔗浆|竹浆|木浆/.test(String(text || ''));
}

export function hasSeedPaperComposition(text) {
  return /成分[：:]/.test(String(text || '')) && /甘蔗浆|竹浆|木浆/.test(String(text || ''));
}

/** 补全为统一种子纸产品信息 */
export function enrichSeedPaperProductInfo(text) {
  const raw = String(text || '').trim();
  if (!raw) return UNIFIED_SEED_PAPER_INFO;
  if (hasSeedPaperComposition(raw) && /产品[：:]/.test(raw) && /特性[：:]/.test(raw)) {
    return raw;
  }
  return UNIFIED_SEED_PAPER_INFO;
}

export function applyCategoryDefaults(form, categoryKey, { fillInfo = true } = {}) {
  if (!form || categoryKey === 'custom') return;
  const cat = getCategoryById(categoryKey);
  if (!cat) return;

  if (cat.defaultDimensions && form.dimensionsMode !== 'custom') {
    form.dimensionsMode = 'preset';
    form.productDimensions = cat.defaultDimensions;
  }

  if (fillInfo) {
    form.productInfo = UNIFIED_SEED_PAPER_INFO;
  }
}

export function syncCategoryFromProductInfo(form) {
  if (!form) return false;
  const info = String(form.productInfo || '').trim();
  if (!isSeedPaperText(info)) return false;

  const enriched = enrichSeedPaperProductInfo(info);
  if (enriched !== info) {
    form.productInfo = enriched;
  }
  return true;
}
