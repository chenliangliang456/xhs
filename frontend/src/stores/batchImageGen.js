import { defineStore } from 'pinia';
import { ref, watch } from 'vue';

const STORAGE_KEY = 'xhs-batch-image-gen';

export const useBatchImageGenStore = defineStore('batchImageGen', () => {
  const form = ref({ prompt: '', count: 4, size: '1:1' });
  const genOptions = ref({
    colorKey: 'white',
    shapeCategory: 'regular',
    shapeKey: 'rectangle',
    styleKey: 'luxury',
    textColorKey: 'black',
    fontKey: 'sans',
  });
  const abcForm = ref({
    categoryKey: 'clothing-tag',
    categoryCustom: '',
    dimensionsMode: 'preset',
    productDimensions: '5cm × 8cm',
    productInfo: '',
    bGridMode: 'preset',
    bGridCount: 5,
    bGridCustomCount: 5,
    bGridCustomLayout: '',
    bFeatureMode: 'frontBack',
    cFeatureMode: 'fullInfo',
    enablePlantingMethod: false,
    plantingMethod: '',
    cSize: '3:4',
  });
  const selectedAnchorIds = ref([]);
  const generatedImages = ref([]);
  const abcSets = ref([]);
  const selectedAnchorId = ref(null);
  const materialAnchor = ref(null);
  const lastBatchId = ref('');
  const statusMessage = ref('');
  const saveFolder = ref('a');

  function persist() {
    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          form: form.value,
          genOptions: genOptions.value,
          abcForm: abcForm.value,
          generatedImages: generatedImages.value,
          abcSets: abcSets.value,
          selectedAnchorId: selectedAnchorId.value,
          selectedAnchorIds: selectedAnchorIds.value,
          materialAnchor: materialAnchor.value,
          lastBatchId: lastBatchId.value,
          statusMessage: statusMessage.value,
          saveFolder: saveFolder.value,
          savedAt: Date.now(),
        })
      );
    } catch {
      // sessionStorage 容量不足时仍保留内存状态
    }
  }

  function restore() {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (data.form) form.value = { prompt: '', count: 4, size: '1:1', ...data.form };
      if (data.genOptions) {
        genOptions.value = {
          colorKey: 'white',
          shapeCategory: 'regular',
          shapeKey: 'rectangle',
          styleKey: 'luxury',
          textColorKey: 'black',
          fontKey: 'sans',
          ...data.genOptions,
        };
      }
      if (data.abcForm) {
        abcForm.value = {
          categoryKey: 'clothing-tag',
          categoryCustom: '',
          dimensionsMode: 'preset',
          productDimensions: '5cm × 8cm',
          productInfo: '',
          bGridMode: 'preset',
          bGridCount: 5,
          bGridCustomCount: 5,
          bGridCustomLayout: '',
          bFeatureMode: 'frontBack',
          cFeatureMode: 'fullInfo',
          enablePlantingMethod: false,
          plantingMethod: '',
          cSize: '3:4',
          ...data.abcForm,
        };
      }
      if (Array.isArray(data.generatedImages)) generatedImages.value = data.generatedImages;
      if (Array.isArray(data.abcSets)) abcSets.value = data.abcSets;
      selectedAnchorId.value = data.selectedAnchorId ?? null;
      selectedAnchorIds.value = Array.isArray(data.selectedAnchorIds) ? data.selectedAnchorIds : [];
      materialAnchor.value = data.materialAnchor ?? null;
      lastBatchId.value = data.lastBatchId || '';
      statusMessage.value = data.statusMessage || '';
      saveFolder.value = data.saveFolder || 'a';
    } catch {
      // ignore corrupt cache
    }
  }

  function resetAll() {
    generatedImages.value = [];
    abcSets.value = [];
    selectedAnchorId.value = null;
    selectedAnchorIds.value = [];
    materialAnchor.value = null;
    lastBatchId.value = '';
    statusMessage.value = '';
    persist();
  }

  function setMaterialAnchor(anchor) {
    materialAnchor.value = anchor;
    selectedAnchorId.value = 'material';
    persist();
  }

  restore();

  let persistTimer = null;
  function schedulePersist() {
    if (persistTimer) clearTimeout(persistTimer);
    persistTimer = setTimeout(() => {
      persistTimer = null;
      persist();
    }, 400);
  }

  watch(
    [form, genOptions, abcForm, generatedImages, abcSets, selectedAnchorId, selectedAnchorIds, materialAnchor, lastBatchId, statusMessage, saveFolder],
    schedulePersist,
    { deep: true }
  );

  return {
    form,
    genOptions,
    abcForm,
    generatedImages,
    abcSets,
    selectedAnchorId,
    selectedAnchorIds,
    materialAnchor,
    lastBatchId,
    statusMessage,
    saveFolder,
    resetAll,
    setMaterialAnchor,
    persist,
  };
});
