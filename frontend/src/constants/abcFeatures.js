/** ABC 套装 — B / C 出图模式 */
import { bGridLabel } from './bGridLayouts';

export const B_FEATURE_MODES = [
  { id: 'frontBack', label: '正反面', desc: '同场景实拍：正反面卡片自然斜靠/交叠（非二宫格、非左右分栏）' },
  { id: 'grid', label: '宫格拼图', desc: '多角度展示 / 可选种植格' },
];

export const C_FEATURE_MODES = [
  { id: 'fullInfo', label: '全面信息', desc: '活字/活版/数码印刷风拆解标注，背景沿用锚点 A' },
  { id: 'standard', label: '标准信息', desc: '分类 + 尺寸 + 核心产品信息' },
];

export function bFeatureLabel(mode) {
  return B_FEATURE_MODES.find((m) => m.id === mode)?.label || '正反面';
}

export function cFeatureLabel(mode) {
  return C_FEATURE_MODES.find((m) => m.id === mode)?.label || '全面信息';
}

export function resolveBSetLabel(set, form = {}) {
  const mode = set?.bFeatureMode ?? form?.bFeatureMode ?? 'frontBack';
  if (mode === 'frontBack') return 'B · 正反面场景';
  return bGridLabel(
    set?.bGridCount ?? form?.bGridCount ?? 5,
    set?.enablePlantingMethod ?? form?.enablePlantingMethod,
    set?.bGridMode ?? form?.bGridMode
  );
}

export function resolveCSetLabel(set, form = {}) {
  const mode = set?.cFeatureMode ?? form?.cFeatureMode ?? 'fullInfo';
  return mode === 'fullInfo' ? 'C · 活字印刷拆解' : 'C · 标准信息';
}
