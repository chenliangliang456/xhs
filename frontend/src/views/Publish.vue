<template>
  <div class="page-container publish-page">
    <PageHero
      title="发布草稿"
      subtitle="选图 · AI 文案 · 一键复制，请在手机小红书 App 手动发布"
      :image="PLACEHOLDERS.publish"
      badge="Draft"
    />

    <el-alert
      type="info"
      :closable="false"
      show-icon
      style="margin-bottom: 20px"
    >
      请在本页生成文案并复制，下载素材后在<strong>手机小红书 App</strong>手动发布。
    </el-alert>

    <WorkflowGuide
      compact
      title="手动发布流程"
      subtitle="素材库选成套 a+b+c → 生成文案 → 复制到 App"
      :steps="draftSteps"
      :active-step="currentStep + 1"
    />

    <el-steps :active="currentStep" finish-status="success" align-center class="steps-bar card-section">
      <el-step title="选择图片" />
      <el-step title="产品信息" />
      <el-step title="AI 文案" />
      <el-step title="复制导出" />
    </el-steps>

    <div v-show="currentStep === 0" class="card-section">
      <div class="section-title">选择图片</div>
      <el-tabs v-model="imageSourceTab">
        <el-tab-pane label="从素材库选择（推荐）" name="material">
          <MaterialSelector v-model="images" />
        </el-tab-pane>
        <el-tab-pane label="手动上传" name="upload">
          <ImageUploader v-model="uploadImages" @update:model-value="onUploadChange" />
        </el-tab-pane>
      </el-tabs>
      <div v-if="images.length > 0" class="selected-preview">
        <span>已选 {{ images.length }} 张：</span>
        <el-tag v-for="img in images" :key="img.id || img.filename" size="small" style="margin: 2px">
          {{ img.filename }}
        </el-tag>
      </div>
      <div class="step-actions">
        <el-button type="primary" :disabled="images.length === 0" @click="currentStep = 1">
          下一步：填写产品信息
        </el-button>
      </div>
    </div>

    <div v-show="currentStep === 1" class="card-section">
      <div class="section-title">产品信息</div>
      <el-form :model="productForm" label-width="100px" style="max-width: 600px">
        <el-form-item label="产品名称" required>
          <el-input v-model="productForm.productName" placeholder="例：种子纸吊牌" />
        </el-form-item>
        <el-form-item label="产品卖点" required>
          <el-input
            v-model="productForm.sellingPoints"
            type="textarea"
            :rows="3"
            placeholder="例：环保可降解、可种植"
          />
        </el-form-item>
        <el-form-item label="产品类型">
          <el-input v-model="productForm.productType" placeholder="例：服装吊牌" />
        </el-form-item>
        <el-form-item label="适用人群">
          <el-input v-model="productForm.targetAudience" placeholder="例：服装店老板" />
        </el-form-item>
        <el-form-item label="风格要求">
          <el-select v-model="productForm.style" placeholder="选择文案风格" style="width: 100%">
            <el-option label="口语化种草" value="口语化种草风" />
            <el-option label="专业测评" value="专业测评风" />
            <el-option label="情感共鸣" value="情感共鸣风" />
            <el-option label="幽默搞笑" value="幽默搞笑风" />
            <el-option label="极简高级" value="极简高级风" />
          </el-select>
        </el-form-item>
      </el-form>
      <div class="step-actions">
        <el-button @click="currentStep = 0">上一步</el-button>
        <el-button type="primary" :loading="generating" @click="generateCopy">
          {{ generating ? 'AI 生成中...' : '生成 AI 文案' }}
        </el-button>
      </div>
    </div>

    <div v-show="currentStep === 2" class="card-section">
      <div class="section-title">AI 生成文案（可编辑）</div>
      <el-form label-width="80px">
        <el-form-item label="标题">
          <el-input v-model="copyForm.title" placeholder="小红书标题">
            <template #append>
              <el-button @click="copyText(copyForm.title)">复制</el-button>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item label="正文">
          <el-input v-model="copyForm.content" type="textarea" :rows="8" placeholder="正文文案" />
          <el-button size="small" style="margin-top: 8px" @click="copyText(copyForm.content)">
            复制正文
          </el-button>
        </el-form-item>
        <el-form-item label="标签">
          <div class="tags-editor">
            <el-tag
              v-for="(tag, idx) in copyForm.tags"
              :key="idx"
              closable
              style="margin: 4px"
              @close="copyForm.tags.splice(idx, 1)"
            >
              #{{ tag }}
            </el-tag>
            <el-input
              v-if="tagInputVisible"
              ref="tagInputRef"
              v-model="tagInputValue"
              size="small"
              style="width: 100px"
              @keyup.enter="addTag"
              @blur="addTag"
            />
            <el-button v-else size="small" @click="showTagInput">+ 添加标签</el-button>
          </div>
        </el-form-item>
      </el-form>
      <div class="step-actions">
        <el-button @click="currentStep = 1">上一步</el-button>
        <el-button :loading="generating" @click="generateCopy">重新生成</el-button>
        <el-button type="primary" @click="goToExport">下一步：复制导出</el-button>
      </div>
    </div>

    <div v-show="currentStep === 3" class="card-section">
      <div class="section-title">复制导出</div>
      <p class="export-hint">将以下内容复制到小红书 App，并上传已选 {{ images.length }} 张图片。</p>
      <div class="export-block">
        <div class="export-row">
          <span class="export-label">标题</span>
          <p>{{ copyForm.title }}</p>
          <el-button text type="primary" @click="copyText(copyForm.title)">复制</el-button>
        </div>
        <div class="export-row block">
          <span class="export-label">正文</span>
          <el-input v-model="copyForm.content" type="textarea" :rows="10" />
          <el-button text type="primary" @click="copyText(copyForm.content)">复制正文</el-button>
        </div>
        <div class="export-row">
          <span class="export-label">标签</span>
          <p>{{ tagLine }}</p>
          <el-button text type="primary" @click="copyText(tagLine)">复制标签</el-button>
        </div>
        <el-button type="primary" @click="copyAll">一键复制全文（标题+正文+标签）</el-button>
      </div>
      <div class="step-actions">
        <el-button @click="currentStep = 2">上一步</el-button>
        <el-button @click="resetAll">重新开始</el-button>
        <router-link to="/materials">
          <el-button type="success">去素材库下载图片</el-button>
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, nextTick, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { aiApi, buildImageSources } from '@/api';
import ImageUploader from '@/components/ImageUploader.vue';
import MaterialSelector from '@/components/MaterialSelector.vue';
import PageHero from '@/components/PageHero.vue';
import WorkflowGuide from '@/components/WorkflowGuide.vue';
import { PLACEHOLDERS } from '@/constants/placeholders';

const draftSteps = [
  { num: 1, title: '选图', desc: '素材库成套 a+b+c', icon: 'Picture' },
  { num: 2, title: '产品信息', desc: '名称与卖点', icon: 'Goods' },
  { num: 3, title: 'AI 文案', desc: 'DeepSeek 生成', icon: 'EditPen' },
  { num: 4, title: '复制', desc: '手机 App 手动发', icon: 'CopyDocument' },
];

const currentStep = ref(0);
const imageSourceTab = ref('material');
const images = ref([]);
const uploadImages = ref([]);
const generating = ref(false);

const productForm = reactive({
  productName: '',
  sellingPoints: '',
  productType: '',
  targetAudience: '',
  style: '口语化种草风',
});

const copyForm = reactive({
  title: '',
  content: '',
  tags: [],
});

const tagInputVisible = ref(false);
const tagInputValue = ref('');
const tagInputRef = ref(null);

const tagLine = computed(() =>
  (copyForm.tags || []).map((t) => (String(t).startsWith('#') ? t : `#${t}`)).join(' ')
);

onMounted(() => {
  try {
    const raw = sessionStorage.getItem('xhs-publish-draft');
    if (raw) {
      const draft = JSON.parse(raw);
      if (draft.title) copyForm.title = draft.title;
      if (draft.content) copyForm.content = draft.content;
      if (Array.isArray(draft.tags)) copyForm.tags = [...draft.tags];
      sessionStorage.removeItem('xhs-publish-draft');
      currentStep.value = 2;
      ElMessage.success('已载入 ABC 套装种草文案');
    }
  } catch {
    // ignore
  }
});

function onUploadChange(list) {
  images.value = list.map((img) => ({ ...img, source: 'upload' }));
}

async function generateCopy() {
  if (!productForm.productName) {
    ElMessage.warning('请输入产品名称');
    return;
  }

  generating.value = true;
  try {
    const res = await aiApi.generate({
      ...productForm,
      imageSources: buildImageSources(images.value),
    });
    copyForm.title = res.data.title;
    copyForm.content = res.data.content;
    copyForm.tags = [...res.data.tags];
    currentStep.value = 2;
    if (res.meta?.mock) {
      ElMessage.warning(res.message || '已使用本地模拟文案');
    } else {
      ElMessage.success(res.message || '文案生成成功');
    }
  } catch {
    // handled
  } finally {
    generating.value = false;
  }
}

function goToExport() {
  if (!copyForm.title || !copyForm.content) {
    ElMessage.warning('请完善标题和正文');
    return;
  }
  currentStep.value = 3;
}

function copyText(text) {
  if (!text) return;
  navigator.clipboard.writeText(text);
  ElMessage.success('已复制到剪贴板');
}

function copyAll() {
  const body = [copyForm.title, '', copyForm.content, '', tagLine.value].filter(Boolean).join('\n');
  copyText(body);
}

function showTagInput() {
  tagInputVisible.value = true;
  nextTick(() => tagInputRef.value?.focus());
}

function addTag() {
  const val = tagInputValue.value.trim().replace(/^#/, '');
  if (val && !copyForm.tags.includes(val)) {
    copyForm.tags.push(val);
  }
  tagInputVisible.value = false;
  tagInputValue.value = '';
}

function resetAll() {
  currentStep.value = 0;
  imageSourceTab.value = 'material';
  images.value = [];
  uploadImages.value = [];
  Object.assign(productForm, {
    productName: '',
    sellingPoints: '',
    productType: '',
    targetAudience: '',
    style: '口语化种草风',
  });
  Object.assign(copyForm, { title: '', content: '', tags: [] });
}
</script>

<style scoped>
.steps-bar {
  margin-bottom: 24px;
  padding: 24px 28px !important;
}

.step-actions {
  margin-top: 28px;
  padding-top: 20px;
  border-top: 1px solid var(--xhs-border);
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  flex-wrap: wrap;
}

.tags-editor {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
}

.selected-preview {
  margin-top: 16px;
  padding: 14px 16px;
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(16, 185, 129, 0.03));
  border: 1px solid rgba(16, 185, 129, 0.15);
  border-radius: var(--xhs-radius-sm);
  font-size: 13px;
  color: var(--xhs-text-secondary);
}

.export-hint {
  color: var(--xhs-text-secondary);
  margin-bottom: 16px;
  font-size: 14px;
}

.export-block {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.export-row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 10px;
}

.export-row.block {
  flex-direction: column;
  align-items: stretch;
}

.export-label {
  font-weight: 600;
  min-width: 48px;
  color: var(--xhs-text-secondary);
}

.export-row p {
  flex: 1;
  margin: 0;
  line-height: 1.6;
}
</style>
