/** B 图宫格布局配置 */
const B_GRID_LAYOUTS = {
  2: {
    label: '二宫格',
    layoutDesc: '1 行 2 列均分',
    plantingCell: 2,
    cells: [
      { n: 1, desc: '参考图同款产品正面或主角度' },
      { n: 2, desc: '参考图同款产品侧面或细节特写' },
    ],
  },
  3: {
    label: '三宫格',
    layoutDesc: '1 行 3 列均分',
    plantingCell: 3,
    cells: [
      { n: 1, desc: '参考图同款产品正面' },
      { n: 2, desc: '参考图同款产品侧面或俯拍' },
      { n: 3, desc: '参考图同款产品细节特写' },
    ],
  },
  4: {
    label: '四宫格',
    layoutDesc: '2 行 2 列均分',
    plantingCell: 4,
    cells: [
      { n: 1, desc: '参考图同款产品正面' },
      { n: 2, desc: '参考图同款产品侧面' },
      { n: 3, desc: '参考图同款产品俯拍或 45°' },
      { n: 4, desc: '参考图同款产品细节特写' },
    ],
  },
  5: {
    label: '五宫格',
    layoutDesc: '上排 2 格、下排 3 格',
    plantingCell: 5,
    cells: [
      { n: 1, desc: '参考图同款产品正面' },
      { n: 2, desc: '参考图同款产品侧面' },
      { n: 3, desc: '参考图同款产品俯拍或 45°' },
      { n: 4, desc: '参考图同款产品细节特写' },
      { n: 5, desc: '参考图同款产品使用场景或包装展示' },
    ],
  },
};

const RANDOM_GRID_COUNTS = [2, 3, 4, 5];

function buildGenericGridLayout(count) {
  const n = normalizeGridCount(count);
  const cells = Array.from({ length: n }, (_, i) => ({
    n: i + 1,
    desc:
      i === n - 1
        ? '参考图同款产品使用场景或细节特写'
        : '参考图同款产品不同角度展示',
  }));
  return {
    label: `${n}宫格`,
    layoutDesc: `自定义 ${n} 格拼图均分排版`,
    plantingCell: n,
    cells,
  };
}

function normalizeGridCount(count) {
  const n = Math.round(Number(count));
  if (n >= 2 && n <= 9) return n;
  return 5;
}

function getGridLayout(count, customLayoutDesc) {
  const n = normalizeGridCount(count);
  const base = B_GRID_LAYOUTS[n] || buildGenericGridLayout(n);
  const desc = String(customLayoutDesc || '').trim();
  if (!desc) return base;
  return { ...base, layoutDesc: desc };
}

function pickRandomGridCount(seed) {
  const s = Math.abs(Number(seed) || Date.now());
  return RANDOM_GRID_COUNTS[s % RANDOM_GRID_COUNTS.length];
}

function resolveBGridCount({ mode, count, customCount, setIndex, seed } = {}) {
  if (mode === 'random') {
    const s = Number(setIndex) || Number(seed) || Date.now();
    return pickRandomGridCount(s);
  }
  if (mode === 'custom') {
    return normalizeGridCount(customCount ?? count);
  }
  return normalizeGridCount(count);
}

module.exports = {
  B_GRID_LAYOUTS,
  RANDOM_GRID_COUNTS,
  getGridLayout,
  normalizeGridCount,
  pickRandomGridCount,
  resolveBGridCount,
};
