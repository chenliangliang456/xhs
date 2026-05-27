<template>
  <div class="material-selector">
    <el-alert
      title="选择 A 文件夹中的一张图，系统自动搭配同编号 B、C 素材（如选 a1 → b1+c1，选 a7 → b7+c7）"
      type="info"
      :closable="false"
      show-icon
      style="margin-bottom: 16px"
    />

    <div v-if="loading" class="loading-box">
      <el-skeleton :rows="4" animated />
    </div>

    <el-empty v-else-if="folderA.length === 0" description="素材库 A 文件夹暂无图片">
      <template #image>
        <div class="empty-visual">
          <img :src="emptyImg" alt="" />
        </div>
      </template>
      <el-button type="primary" @click="$router.push('/materials')">去素材库上传</el-button>
    </el-empty>

    <template v-else>
      <div class="folder-label">文件夹 A — 点击选择主图</div>
      <div class="material-grid">
        <div
          v-for="item in folderA"
          :key="item.path"
          class="material-item"
          :class="{ active: selectedIndex === item.index }"
          @click="selectItem(item)"
        >
          <img :src="assetUrl(item.url)" :alt="item.filename" />
          <span class="item-tag">{{ item.filename }}</span>
          <el-icon v-if="selectedIndex === item.index" class="check-icon"><CircleCheck /></el-icon>
        </div>
      </div>

      <div v-if="matchedSet" class="matched-preview">
        <div class="preview-title">
          已选套装 {{ matchedSet.index }}：
          <el-tag v-if="matchedSet.complete" type="success" size="small">完整</el-tag>
          <el-tag v-else type="warning" size="small">缺少 {{ matchedSet.missing?.join('、') }}</el-tag>
        </div>
        <div class="matched-row">
          <div v-for="slot in ['a', 'b', 'c']" :key="slot" class="matched-slot">
            <div class="slot-label">文件夹 {{ slot.toUpperCase() }}</div>
            <template v-if="matchedSet[slot]">
              <img :src="assetUrl(matchedSet[slot].url)" :alt="matchedSet[slot].filename" />
              <span>{{ matchedSet[slot].filename }}</span>
            </template>
            <div v-else class="slot-empty">{{ slot }}{{ matchedSet.index }} 缺失</div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue';
import { CircleCheck } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { materialApi } from '@/api';
import { PLACEHOLDERS } from '@/constants/placeholders';
import { assetUrl } from '@/utils/assetUrl';

const emptyImg = PLACEHOLDERS.emptyMaterials;

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
});

const emit = defineEmits(['update:modelValue']);

const loading = ref(true);
const folderA = ref([]);
const selectedIndex = ref(null);
const matchedSet = ref(null);

async function loadMaterials() {
  loading.value = true;
  try {
    const res = await materialApi.list();
    folderA.value = res.data.folders.a || [];
  } catch {
    // 错误已处理
  } finally {
    loading.value = false;
  }
}

async function selectItem(item) {
  try {
    const res = await materialApi.match('a', item.filename);
    matchedSet.value = res.data;
    selectedIndex.value = res.data.index;

    if (!res.data.complete) {
      ElMessage.warning(`套装 ${res.data.index} 不完整，缺少：${res.data.missing.join('、')}`);
    }

    const images = res.data.items.map((m) => ({
      id: m.path,
      filename: m.filename,
      folder: m.folder,
      path: m.path,
      url: m.url,
      source: 'material',
      index: m.index,
    }));

    emit('update:modelValue', images);
    ElMessage.success(`已选择套装 a${res.data.index} + b${res.data.index} + c${res.data.index}`);
  } catch {
    // 错误已处理
  }
}

onMounted(loadMaterials);

watch(
  () => props.modelValue,
  (val) => {
    if (!val?.length) {
      selectedIndex.value = null;
      matchedSet.value = null;
    }
  }
);
</script>

<style scoped>
.folder-label {
  font-weight: 600;
  margin-bottom: 12px;
  color: #303133;
}

.material-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: 12px;
}

.material-item {
  position: relative;
  border: 2px solid var(--xhs-border);
  border-radius: 14px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: var(--xhs-shadow);
}

.material-item:hover {
  border-color: var(--xhs-primary-light);
  transform: translateY(-2px);
}

.material-item.active {
  border-color: var(--xhs-primary);
  box-shadow: 0 0 0 3px rgba(255, 36, 66, 0.15), var(--xhs-shadow-lg);
}

.material-item img {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  display: block;
}

.item-tag {
  display: block;
  text-align: center;
  font-size: 12px;
  padding: 4px;
  background: #f5f7fa;
  color: #606266;
}

.check-icon {
  position: absolute;
  top: 6px;
  right: 6px;
  color: var(--xhs-primary);
  font-size: 22px;
  background: #fff;
  border-radius: 50%;
}

.matched-preview {
  margin-top: 24px;
  padding: 20px;
  background: linear-gradient(135deg, var(--xhs-bg), #fff);
  border: 1px solid var(--xhs-border);
  border-radius: var(--xhs-radius-sm);
}

.preview-title {
  font-weight: 600;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.matched-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.matched-slot {
  text-align: center;
  background: #fff;
  border-radius: 8px;
  padding: 12px;
}

.slot-label {
  font-size: 13px;
  color: #909399;
  margin-bottom: 8px;
}

.matched-slot img {
  width: 100%;
  max-width: 120px;
  aspect-ratio: 1;
  object-fit: cover;
  border-radius: 6px;
}

.matched-slot span {
  display: block;
  margin-top: 6px;
  font-size: 12px;
  color: #606266;
}

.slot-empty {
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #c0c4cc;
  font-size: 13px;
  border: 1px dashed #dcdfe6;
  border-radius: 6px;
}
</style>
