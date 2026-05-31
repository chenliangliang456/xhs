/** B 图宫格布局（与 lib/bGridLayouts.js 保持一致） */
export const B_GRID_OPTIONS = [
  { count: 2, label: '二宫格', layoutDesc: '1×2' },
  { count: 3, label: '三宫格', layoutDesc: '1×3' },
  { count: 4, label: '四宫格', layoutDesc: '2×2' },
  { count: 5, label: '五宫格', layoutDesc: '上2下3' },
];

export const B_GRID_MODES = {
  preset: 'preset',
  random: 'random',
  custom: 'custom',
};

export const RANDOM_GRID_COUNTS = [2, 3, 4, 5];

export const B_GRID_LAYOUTS = {
  2: {
    label: '二宫格',
    layoutDesc: '1 行 2 列',
    plantingCell: 2,
    cells: [
      { n: 1, short: '正面', cols: 1 },
      { n: 2, short: '侧面', cols: 1 },
    ],
    gridClass: 'grid-2',
  },
  3: {
    label: '三宫格',
    layoutDesc: '1 行 3 列',
    plantingCell: 3,
    cells: [
      { n: 1, short: '正面', cols: 1 },
      { n: 2, short: '侧面', cols: 1 },
      { n: 3, short: '特写', cols: 1 },
    ],
    gridClass: 'grid-3',
  },
  4: {
    label: '四宫格',
    layoutDesc: '2 行 2 列',
    plantingCell: 4,
    cells: [
      { n: 1, short: '正面', cols: 1 },
      { n: 2, short: '侧面', cols: 1 },
      { n: 3, short: '俯拍', cols: 1 },
      { n: 4, short: '特写', cols: 1 },
    ],
    gridClass: 'grid-4',
  },
  5: {
    label: '五宫格',
    layoutDesc: '上排 2 格、下排 3 格',
    plantingCell: 5,
    cells: [
      { n: 1, short: '正面', cols: 2 },
      { n: 2, short: '侧面', cols: 2 },
      { n: 3, short: '俯拍', cols: 1 },
      { n: 4, short: '特写', cols: 1 },
      { n: 5, short: '场景', cols: 1 },
    ],
    gridClass: 'grid-5',
  },
};

function buildGenericGridLayout(count) {
  const n = normalizeGridCount(count);
  const cells = Array.from({ length: n }, (_, i) => ({
    n: i + 1,
    short: i === n - 1 ? '场景' : `格${i + 1}`,
    cols: 1,
  }));
  const cols = n <= 3 ? n : n <= 4 ? 2 : 3;
  return {
    label: `${n}宫格`,
    layoutDesc: `自定义 ${n} 格`,
    plantingCell: n,
    cells,
    gridClass: `grid-${Math.min(cols, 5)}`,
  };
}

export function normalizeGridCount(count) {
  const n = Math.round(Number(count));
  if (n >= 2 && n <= 9) return n;
  return 5;
}

export function getGridLayout(count, customLayoutDesc) {
  const n = normalizeGridCount(count);
  const base = B_GRID_LAYOUTS[n] || buildGenericGridLayout(n);
  const desc = String(customLayoutDesc || '').trim();
  if (!desc) return base;
  return { ...base, layoutDesc: desc };
}

export function pickRandomGridCount(seed) {
  const s = Math.abs(Number(seed) || Date.now());
  return RANDOM_GRID_COUNTS[s % RANDOM_GRID_COUNTS.length];
}

export function resolveBGridCount(form, setIndex, seed) {
  if (!form) return 5;
  if (form.bGridMode === B_GRID_MODES.random) {
    return pickRandomGridCount(Number(setIndex) || Number(seed) || Date.now());
  }
  if (form.bGridMode === B_GRID_MODES.custom) {
    return normalizeGridCount(form.bGridCustomCount ?? form.bGridCount);
  }
  return normalizeGridCount(form.bGridCount);
}

export function bGridModeLabel(mode) {
  if (mode === B_GRID_MODES.random) return '随机宫格';
  if (mode === B_GRID_MODES.custom) return '自定义宫格';
  return '';
}

export function bGridLabel(count, enablePlanting, mode) {
  if (mode === B_GRID_MODES.random) {
    const base = 'B · 随机宫格（2～5）';
    return enablePlanting ? `${base}（含种植格）` : base;
  }
  const layout = getGridLayout(count);
  const base = `B · ${layout.label}`;
  return enablePlanting ? `${base}（含种植格）` : base;
}
