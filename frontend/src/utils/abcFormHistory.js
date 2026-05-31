const CATEGORY_KEY = 'xhs-abc-category-history';
const DIMENSIONS_KEY = 'xhs-abc-dimensions-history';
const MAX_ITEMS = 30;

function loadList(key) {
  try {
    const raw = localStorage.getItem(key);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function saveList(key, list) {
  try {
    localStorage.setItem(key, JSON.stringify(list.slice(0, MAX_ITEMS)));
  } catch {
    // ignore quota errors
  }
}

function pushHistory(key, value) {
  const text = String(value || '').trim();
  if (!text) return loadList(key);
  const next = [text, ...loadList(key).filter((item) => item !== text)];
  saveList(key, next);
  return next;
}

export function loadCategoryHistory() {
  return loadList(CATEGORY_KEY);
}

export function loadDimensionsHistory() {
  return loadList(DIMENSIONS_KEY);
}

export function rememberCategory(value) {
  return pushHistory(CATEGORY_KEY, value);
}

export function rememberDimensions(value) {
  return pushHistory(DIMENSIONS_KEY, value);
}

export function rememberAbcFormInputs(form) {
  const categories = form?.categoryKey === 'custom' ? rememberCategory(form.categoryCustom) : loadCategoryHistory();
  const dimensions =
    form?.dimensionsMode === 'custom' || form?.categoryKey === 'custom'
      ? rememberDimensions(form?.productDimensions)
      : loadDimensionsHistory();
  return { categories, dimensions };
}
