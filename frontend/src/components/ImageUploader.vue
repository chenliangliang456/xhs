<template>
  <div class="image-uploader">
    <el-upload
      :auto-upload="false"
      :show-file-list="false"
      multiple
      accept="image/*"
      :on-change="handleFileChange"
    >
      <div class="upload-trigger">
        <el-icon :size="32"><Plus /></el-icon>
        <span>点击上传图片（支持多张）</span>
      </div>
    </el-upload>

    <div v-if="modelValue.length > 0" class="image-preview-list" style="margin-top: 16px">
      <div
        v-for="(img, index) in modelValue"
        :key="img.id"
        class="image-preview-item"
        draggable="true"
        @dragstart="dragIndex = index"
        @dragover.prevent
        @drop="handleDrop(index)"
      >
        <img :src="assetUrl(img.url)" :alt="img.originalName" />
        <span class="sort-badge">{{ index + 1 }}</span>
        <div class="actions">
          <el-button
            v-if="index > 0"
            circle
            size="small"
            type="primary"
            @click="moveImage(index, -1)"
          >
            <el-icon><ArrowLeft /></el-icon>
          </el-button>
          <el-button
            v-if="index < modelValue.length - 1"
            circle
            size="small"
            type="primary"
            @click="moveImage(index, 1)"
          >
            <el-icon><ArrowRight /></el-icon>
          </el-button>
          <el-button circle size="small" type="danger" @click="removeImage(index)">
            <el-icon><Delete /></el-icon>
          </el-button>
        </div>
      </div>
    </div>

    <el-progress
      v-if="uploading"
      :percentage="uploadProgress"
      style="margin-top: 12px"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { Plus, Delete, ArrowLeft, ArrowRight } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { uploadApi } from '@/api';
import { assetUrl } from '@/utils/assetUrl';

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
});

const emit = defineEmits(['update:modelValue']);

const uploading = ref(false);
const uploadProgress = ref(0);
const dragIndex = ref(-1);

async function handleFileChange(file) {
  if (!file.raw) return;

  const formData = new FormData();
  formData.append('images', file.raw);

  uploading.value = true;
  uploadProgress.value = 30;

  try {
    const res = await uploadApi.upload(formData);
    uploadProgress.value = 100;

    const newImages = [...props.modelValue, ...res.data];
    emit('update:modelValue', newImages);
    ElMessage.success(res.message);
  } catch {
    // 错误已处理
  } finally {
    uploading.value = false;
    uploadProgress.value = 0;
  }
}

async function removeImage(index) {
  const img = props.modelValue[index];
  try {
    await uploadApi.remove(img.filename);
  } catch {
    // 忽略删除失败
  }
  const list = [...props.modelValue];
  list.splice(index, 1);
  emit('update:modelValue', list);
}

function moveImage(index, direction) {
  const list = [...props.modelValue];
  const target = index + direction;
  [list[index], list[target]] = [list[target], list[index]];
  emit('update:modelValue', list);
}

function handleDrop(targetIndex) {
  if (dragIndex.value < 0 || dragIndex.value === targetIndex) return;
  const list = [...props.modelValue];
  const [item] = list.splice(dragIndex.value, 1);
  list.splice(targetIndex, 0, item);
  emit('update:modelValue', list);
  dragIndex.value = -1;
}
</script>

<style scoped>
.upload-trigger {
  width: 100%;
  max-width: 320px;
  min-height: 140px;
  border: 2px dashed var(--xhs-border);
  border-radius: var(--xhs-radius-sm);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--xhs-text-secondary);
  transition: all 0.25s ease;
  background:
    linear-gradient(135deg, rgba(255, 36, 66, 0.03), rgba(99, 102, 241, 0.03)),
    var(--xhs-bg);
}

.upload-trigger:hover {
  border-color: var(--xhs-primary);
  color: var(--xhs-primary);
  background: var(--xhs-primary-soft);
  transform: translateY(-1px);
}

.upload-trigger span {
  margin-top: 10px;
  font-size: 13px;
  font-weight: 500;
}
</style>
