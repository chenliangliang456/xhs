<template>
  <div class="page-container batch-gen">
    <PageHero
      title="AI 批量生图"
      subtitle="批量生成 A 图 → 多选锚点 → 批量生成多套 B 五宫格 + C 产品信息图"
      :image="PLACEHOLDERS.batchImage"
      badge="AI Generate"
    />

    <WorkflowGuide
      title="本页操作顺序"
      subtitle="点击卡片可跳转；勾选锚点请点缩略图或复选框，不要用预览按钮"
      :steps="BATCH_IMAGE_WORKFLOW"
      :active-step="workflowActiveStep"
    />

    <div class="card-section api-config-panel">
      <div class="config-head">
        <div>
          <h3 class="section-title">
            <el-icon><Setting /></el-icon>
            文生图 API 配置
          </h3>
          <p class="config-sub">配置保存在 <code>backend/.env</code>，修改后需重启后端</p>
        </div>
        <div class="config-head-actions">
          <el-tag :type="apiConfigured ? 'success' : 'danger'" size="large" effect="dark">
            {{ apiConfigured ? '已配置，可正常生图' : '未配置' }}
          </el-tag>
          <el-button text type="primary" @click="apiConfigExpanded = !apiConfigExpanded">
            {{ apiConfigExpanded ? '收起说明' : '展开说明' }}
            <el-icon><component :is="apiConfigExpanded ? 'ArrowUp' : 'ArrowDown'" /></el-icon>
          </el-button>
        </div>
      </div>

      <el-descriptions v-if="apiConfigExpanded && imageGenSettings" :column="1" border class="config-desc">
        <el-descriptions-item label="接口地址">
          {{ imageGenSettings.apiBaseUrl || '（空，请在 .env 填写 IMAGE_GEN_API_BASE_URL）' }}
        </el-descriptions-item>
        <el-descriptions-item label="API Key">
          {{ imageGenSettings.apiKey || '（空，请在 .env 填写 IMAGE_GEN_API_KEY）' }}
        </el-descriptions-item>
        <el-descriptions-item label="模型">gpt-image-2（固定）</el-descriptions-item>
      </el-descriptions>

      <template v-if="apiConfigExpanded">
        <div class="env-template">
          <div class="env-template-title">在 <code>backend/.env</code> 中添加或修改：</div>
          <pre class="env-code"># AI 批量文生图
IMAGE_GEN_API_BASE_URL=https://你的API网关地址
IMAGE_GEN_API_KEY=你的API密钥</pre>
          <p class="env-note">
            也支持旧变量名 <code>API_BASE_URL</code> / <code>API_KEY</code>，保存后重启后端。
          </p>
        </div>
      </template>
      <p v-else-if="!apiConfigured" class="config-collapsed-hint">
        未配置时请点击「展开说明」查看 <code>backend/.env</code> 填写方式，或前往
        <router-link to="/settings?tab=imageGen">系统设置</router-link>。
      </p>

      <div class="config-actions">
        <router-link to="/settings?tab=imageGen">
          <el-button><el-icon><Setting /></el-icon> 查看系统设置</el-button>
        </router-link>
        <el-button type="primary" plain @click="refreshApiStatus">
          <el-icon><Refresh /></el-icon> 刷新状态
        </el-button>
      </div>
    </div>

    <el-alert
      v-if="!apiConfigured"
      title="文生图 API 未配置，请先填写上方接口信息"
      type="error"
      :closable="false"
      show-icon
      style="margin-bottom: 16px"
    />

    <div class="card-section">
      <el-form label-width="90px" @submit.prevent="handleSubmit">
        <el-form-item label="图片描述" required>
          <el-input
            v-model="form.prompt"
            type="textarea"
            :rows="4"
            placeholder="例如：端午礼盒产品实拍，中式风格，暖色调，高清"
          />
        </el-form-item>

        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="生成数量">
              <el-input-number
                v-model="form.count"
                :min="1"
                :max="maxCount"
                controls-position="right"
                style="width: 100%"
              />
              <div class="field-hint">范围 1–{{ maxCount }}，先批量生成再选锚点</div>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="图片尺寸">
              <el-select v-model="form.size" style="width: 100%">
                <el-option label="1:1（方形）" value="1:1" />
                <el-option label="16:9（横屏）" value="16:9" />
                <el-option label="9:16（竖屏）" value="9:16" />
                <el-option label="4:3（横屏）" value="4:3" />
                <el-option label="3:4（竖屏）" value="3:4" />
                <el-option label="3:2（横屏）" value="3:2" />
                <el-option label="2:3（竖屏）" value="2:3" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item>
          <el-button
            type="primary"
            :loading="loading"
            :disabled="!apiConfigured || !form.prompt.trim()"
            @click="handleSubmit"
          >
            {{ loading ? '正在生成...' : '开始批量生成' }}
          </el-button>
          <el-button
            v-if="loading || generatingAbc"
            type="danger"
            plain
            @click="cancelGeneration"
          >
            取消生成
          </el-button>
          <el-button v-if="generatedImages.length && !loading" @click="resetAll">清空结果</el-button>
        </el-form-item>

        <el-progress
          v-if="loading && progress.total"
          :percentage="progressPercent"
          :format="() => progressText"
          style="margin-top: 8px"
        />
        <p v-if="statusMessage" class="status-msg">{{ statusMessage }}</p>
      </el-form>
    </div>

    <el-alert
      v-if="hasRestoredWork"
      title="已恢复上次生成内容，切换页面不会丢失（关闭浏览器标签后需重新生成）"
      type="success"
      :closable="true"
      show-icon
      style="margin-bottom: 16px"
      @close="hasRestoredWork = false"
    />

    <!-- ABC 锚点生成面板 -->
    <div v-if="generatedImages.length || materialAnchor" class="card-section abc-panel">
      <div class="section-title">ABC 套装生成</div>
      <el-alert type="info" :closable="false" show-icon style="margin-bottom: 16px">
        <template v-if="materialAnchor">
          已从<strong>素材库 A 图</strong>加载锚点，填写产品信息后生成
          <strong>B（五宫格）</strong> 和 <strong>C（产品信息图）</strong>。
        </template>
        <template v-else>
          在下方勾选锚点 A 后批量生成：B 为<strong>同一产品</strong>的五宫格（4 格多角度 + 1 格种植/方法），C 为<strong>同款主图 + 产品信息</strong>。
        </template>
      </el-alert>

      <div v-if="anchorImage" class="anchor-preview">
        <img :src="anchorImage.dataUrl" alt="锚点 A" />
        <div class="anchor-info">
          <el-tag type="danger" effect="dark">锚点 A</el-tag>
          <span v-if="anchorImage.source === 'material'">
            素材库 · {{ anchorImage.filename || anchorImage.path }}
          </span>
          <span v-else>第 {{ anchorImage.id }} 张 · {{ anchorImage.prompt?.slice(0, 40) }}...</span>
          <el-button
            size="small"
            type="primary"
            plain
            :loading="zipping"
            style="margin-left: auto"
            @click="downloadZip"
          >
            下载锚点 ZIP
          </el-button>
        </div>
      </div>
      <p v-else class="anchor-hint">← 请先在下方勾选一张或多张图片作为锚点 A</p>
      <p v-if="batchAnchorList.length > 1" class="anchor-hint batch-count">
        已选 {{ batchAnchorList.length }} 个锚点，将按顺序批量生成 {{ batchAnchorList.length }} 套 B+C
      </p>

      <el-form label-width="100px" class="abc-form">
        <el-form-item label="产品尺寸">
          <el-input
            v-model="abcForm.productDimensions"
            placeholder="例：长 25cm × 宽 18cm × 高 8cm / 500ml"
          />
        </el-form-item>
        <el-form-item label="产品信息">
          <el-input
            v-model="abcForm.productInfo"
            type="textarea"
            :rows="3"
            placeholder="例：材质、成分、卖点、适用场景、规格参数等"
          />
        </el-form-item>
        <el-form-item label="种植/方法">
          <el-input
            v-model="abcForm.plantingMethod"
            type="textarea"
            :rows="2"
            placeholder="填写后仅占用 B 图第 5 格（右下角），其余 4 格为 A 图同款产品的不同角度"
          />
        </el-form-item>
        <el-form-item label="C 图尺寸">
          <el-select v-model="abcForm.cSize" style="width: 200px">
            <el-option label="3:4（竖屏，推荐）" value="3:4" />
            <el-option label="9:16（竖屏）" value="9:16" />
            <el-option label="1:1（方形）" value="1:1" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button
            v-if="batchAnchorList.length <= 1"
            type="primary"
            :loading="generatingAbc"
            :disabled="!batchAnchorList.length"
            @click="handleGenerateAbc"
          >
            {{ generatingAbc ? '正在生成 B + C...' : '以锚点 A 生成 B + C' }}
          </el-button>
          <el-button
            v-else
            type="primary"
            :loading="generatingAbc"
            :disabled="!batchAnchorList.length"
            @click="handleGenerateAbc"
          >
            {{ generatingAbc ? `批量生成中 (${abcBatchProgress})...` : `批量生成 B+C（${batchAnchorList.length} 套）` }}
          </el-button>
          <el-button
            v-if="generatingAbc"
            type="danger"
            plain
            @click="cancelGeneration"
          >
            取消生成
          </el-button>
        </el-form-item>
      </el-form>

      <!-- 五宫格示意 -->
      <div class="grid5-demo">
        <span class="demo-label">B 图 · 五宫格（4 格 A 多角度 + 1 格种植/方法）</span>
        <div class="grid5-layout">
          <div class="grid5-cell"><span>1</span><small>正面</small></div>
          <div class="grid5-cell"><span>2</span><small>侧面</small></div>
          <div class="grid5-cell"><span>3</span><small>俯拍</small></div>
          <div class="grid5-cell"><span>4</span><small>特写</small></div>
          <div class="grid5-cell method"><span>5</span><small>种植/方法</small></div>
        </div>
      </div>
    </div>

    <!-- ABC 套装结果 -->
    <div v-for="set in abcSets" :key="set.setIndex" class="card-section abc-set-card">
      <div class="set-header">
        <span class="section-title">套装 #{{ set.setIndex }}</span>
        <el-button type="primary" size="small" :loading="savingSetId === set.setIndex" @click="saveAbcSet(set)">
          保存为 a{{ set.setIndex }} / b{{ set.setIndex }} / c{{ set.setIndex }}
        </el-button>
      </div>
      <div class="abc-row">
        <div class="abc-slot">
          <span class="slot-tag a">A · 锚点</span>
          <el-image :src="set.anchor.dataUrl" fit="cover" class="slot-img" :preview-src-list="[set.anchor.dataUrl]" />
        </div>
        <div class="abc-slot">
          <span class="slot-tag b">B · 五宫格</span>
          <el-image v-if="set.b" :src="set.b.dataUrl" fit="cover" class="slot-img" :preview-src-list="[set.b.dataUrl]" />
          <div v-else class="slot-loading"><el-icon class="is-loading"><Loading /></el-icon></div>
        </div>
        <div class="abc-slot">
          <span class="slot-tag c">C · 产品信息</span>
          <el-image v-if="set.c" :src="set.c.dataUrl" fit="cover" class="slot-img" :preview-src-list="[set.c.dataUrl]" />
          <div v-else class="slot-loading"><el-icon class="is-loading"><Loading /></el-icon></div>
        </div>
      </div>
    </div>

    <div v-if="hasDownloadableImages" class="card-section">
      <div class="section-title">
        生成结果（锚点 {{ anchorCandidateCount }} 张 · 共 {{ generatedImages.length }} 张）
        <span v-if="selectedAnchorIds.length > 1" class="select-hint">
          已选 {{ selectedAnchorIds.length }} 个锚点：第 {{ selectedAnchorIds.join('、') }} 张
        </span>
        <span v-else-if="selectedAnchorId && selectedAnchorId !== 'material'" class="select-hint">
          已选锚点：第 {{ selectedAnchorId }} 张
        </span>
        <span v-else-if="selectedAnchorId === 'material'" class="select-hint">已选素材库锚点</span>
      </div>

      <div class="toolbar">
        <el-button
          v-if="anchorCandidateImages.length > 1"
          size="small"
          @click="selectAllAnchorCandidates"
        >
          全选锚点候选
        </el-button>
        <el-button
          v-if="selectedAnchorIds.length"
          size="small"
          @click="clearAnchorSelection"
        >
          清空勾选
        </el-button>
        <el-button type="primary" :loading="zipping" @click="downloadZip">
          批量下载 ZIP（{{ zipEntryCount }} 个文件）
        </el-button>
        <el-select v-model="saveFolder" style="width: 100px">
          <el-option label="文件夹 a" value="a" />
          <el-option label="文件夹 b" value="b" />
          <el-option label="文件夹 c" value="c" />
        </el-select>
        <el-button :loading="saving" @click="saveToMaterials">保存到素材库</el-button>
        <el-button type="success" @click="goPublish">去一键发布</el-button>
      </div>

      <div class="image-grid">
        <div
          v-for="img in generatedImages"
          :key="img.id"
          class="image-card"
          :class="{ selected: isAnchorSelected(img), 'is-anchor': img.role === 'a', 'is-b': img.role === 'b', 'is-c': img.role === 'c' }"
          @click="onCardClick(img, $event)"
        >
          <div class="select-overlay">
            <el-checkbox
              :model-value="isAnchorSelected(img)"
              :disabled="!!(img.role && img.role !== 'a')"
              @click.stop
              @change="() => toggleAnchor(img)"
            />
            <div class="overlay-tags">
              <el-tag v-if="img.role === 'a'" type="danger" size="small" effect="dark">A</el-tag>
              <el-tag v-else-if="img.role === 'b'" type="warning" size="small" effect="dark">B</el-tag>
              <el-tag v-else-if="img.role === 'c'" type="success" size="small" effect="dark">C</el-tag>
              <el-button
                class="preview-btn"
                circle
                size="small"
                title="预览大图"
                @click.stop="openPreview(img.dataUrl)"
              >
                <el-icon><ZoomIn /></el-icon>
              </el-button>
            </div>
          </div>
          <img :src="img.dataUrl" alt="" class="image-thumb" loading="lazy" draggable="false" />
          <div class="image-meta">
            <span>{{ img.role ? `${img.role.toUpperCase()} · ` : '' }}第 {{ img.id }} 张</span>
            <span v-if="img.setIndex">套装 #{{ img.setIndex }}</span>
          </div>
        </div>
      </div>
    </div>

    <el-image-viewer
      v-if="previewVisible"
      :url-list="[previewUrl]"
      teleported
      @close="previewVisible = false"
    />

    <div v-else-if="!loading" class="card-section empty-state">
      <div class="empty-visual">
        <img :src="PLACEHOLDERS.emptyGallery" alt="等待生成" />
      </div>
      <p class="empty-title">生成结果将显示在这里</p>
      <p class="empty-hint">先批量生成图片，再勾选一张或多张作为锚点 A，批量生成 B 五宫格 + C 产品信息图</p>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { ElMessage } from 'element-plus';
import { Loading, Setting, Refresh, ZoomIn, ArrowUp, ArrowDown } from '@element-plus/icons-vue';
import JSZip from 'jszip';
import { imageGenApi, settingsApi } from '@/api';
import PageHero from '@/components/PageHero.vue';
import WorkflowGuide from '@/components/WorkflowGuide.vue';
import { PLACEHOLDERS, BATCH_IMAGE_WORKFLOW } from '@/constants/placeholders';
import { useBatchImageGenStore } from '@/stores/batchImageGen';
import { urlToDataUrl } from '@/utils/imageDataUrl';
import { assetUrl } from '@/utils/assetUrl';

const router = useRouter();
const route = useRoute();
const genStore = useBatchImageGenStore();

const {
  form,
  abcForm,
  generatedImages,
  abcSets,
  selectedAnchorId,
  selectedAnchorIds,
  materialAnchor,
  lastBatchId,
  statusMessage,
  saveFolder,
} = storeToRefs(genStore);

const loading = ref(false);
const generatingAbc = ref(false);
/** 递增即取消当前进行中的批量/ABC 生成 */
const genSessionId = ref(0);
const abcBatchProgress = ref('');
const zipping = ref(false);
const saving = ref(false);
const savingSetId = ref(null);
const apiConfigured = ref(false);
const imageGenSettings = ref(null);
const hasRestoredWork = ref(false);
const maxCount = ref(200);
const submitChunk = ref(40);
const pollHint = ref({ maxAttempts: 60, intervalMs: 3000, fastAttempts: 8, fastIntervalMs: 2000 });
const apiConfigExpanded = ref(false);
const previewVisible = ref(false);
const previewUrl = ref('');

const progress = reactive({ done: 0, total: 0, failed: 0 });

const POLL_CONCURRENCY = 10;
const SUBMIT_PARALLEL = 2;

/** 批量生成的锚点候选图（未标记 B/C 角色） */
const anchorCandidateImages = computed(() =>
  generatedImages.value.filter((img) => !img.role)
);

const anchorCandidateCount = computed(() => {
  let n = anchorCandidateImages.value.length;
  if (materialAnchor.value?.dataUrl && selectedAnchorId.value === 'material') {
    n += 1;
  }
  return n;
});

const hasDownloadableImages = computed(
  () =>
    generatedImages.value.length > 0 ||
    materialAnchor.value?.dataUrl ||
    abcSets.value.length > 0
);

const zipEntryCount = computed(() => collectDownloadEntries().length);

const anchorImage = computed(() => {
  if (selectedAnchorId.value === 'material' && materialAnchor.value) {
    return materialAnchor.value;
  }
  return generatedImages.value.find((img) => img.id === selectedAnchorId.value) || null;
});

const batchAnchorList = computed(() => {
  if (selectedAnchorId.value === 'material' && materialAnchor.value) {
    return [materialAnchor.value];
  }
  const ids =
    selectedAnchorIds.value.length > 0
      ? selectedAnchorIds.value
      : selectedAnchorId.value
        ? [selectedAnchorId.value]
        : [];
  return ids
    .map((id) => generatedImages.value.find((img) => img.id === id && (!img.role || img.role === 'a')))
    .filter(Boolean)
    .sort((a, b) => a.id - b.id);
});

function isCancelled(sessionId) {
  return sessionId !== genSessionId.value;
}

function cancelGeneration() {
  genSessionId.value += 1;
  loading.value = false;
  generatingAbc.value = false;
  abcBatchProgress.value = '';
  statusMessage.value = '已取消生成';
  ElMessage.info('已取消生成');
}
const progressPercent = computed(() =>
  progress.total ? Math.round((progress.done / progress.total) * 100) : 0
);
const progressText = computed(() => {
  const base = `${progress.done}/${progress.total}`;
  return progress.failed ? `${base}（失败 ${progress.failed}）` : base;
});

const workflowActiveStep = computed(() => {
  if (abcSets.value.some((s) => s.b && s.c)) return 4;
  if (batchAnchorList.value.length && (abcForm.value.productDimensions || abcForm.value.productInfo)) {
    return generatingAbc.value ? 3 : 2;
  }
  if (generatedImages.value.length) return 2;
  return 1;
});

function openPreview(url) {
  if (!url) return;
  previewUrl.value = url;
  previewVisible.value = true;
}

function onCardClick(img, event) {
  if (event.target.closest('.preview-btn, .el-checkbox')) return;
  if (img.role && img.role !== 'a') return;
  toggleAnchor(img);
}

async function refreshApiStatus() {
  try {
    const data = await imageGenApi.health();
    if (data.maxCount) maxCount.value = data.maxCount;
    if (data.submitChunk) submitChunk.value = data.submitChunk;
    if (data.pollHint) pollHint.value = { ...pollHint.value, ...data.pollHint };
    apiConfigured.value = data.apiConfigured === true;
    if (!apiConfigured.value) apiConfigExpanded.value = true;
  } catch {
    apiConfigured.value = false;
    apiConfigExpanded.value = true;
  }
  try {
    const res = await settingsApi.get();
    imageGenSettings.value = res.data?.imageGen || null;
  } catch {
    imageGenSettings.value = null;
  }
}

async function loadMaterialAnchorFromRoute() {
  const q = route.query;
  if (q.from !== 'materials' || !q.path) return;

  try {
    const url = assetUrl(q.url ? String(q.url) : `/materials/${q.path}`);
    const dataUrl = await urlToDataUrl(url);
    const anchor = {
      id: 'material',
      dataUrl,
      url,
      path: String(q.path),
      filename: String(q.filename || ''),
      index: String(q.index || ''),
      prompt: form.value.prompt?.trim() || `素材库 A 图 ${q.filename || q.path}`,
      source: 'material',
      role: 'a',
    };
    genStore.setMaterialAnchor(anchor);
    statusMessage.value = `已加载素材 A：${anchor.filename || anchor.path}`;
    ElMessage.success('已加载素材 A 图，请填写产品信息后生成 B + C');
    await nextTick();
    document.querySelector('.abc-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (err) {
    ElMessage.error(err.message || '加载素材图片失败');
  }

  router.replace({ path: '/batch-image' });
}

onMounted(async () => {
  if (generatedImages.value.length || materialAnchor.value || abcSets.value.length) {
    hasRestoredWork.value = true;
  }
  await refreshApiStatus();
  await loadMaterialAnchorFromRoute();
});

function isAnchorSelected(img) {
  if (img.role && img.role !== 'a') return false;
  return (
    selectedAnchorIds.value.includes(img.id) ||
    selectedAnchorId.value === img.id
  );
}

function toggleAnchor(img) {
  if (img.role && img.role !== 'a') return;
  materialAnchor.value = null;
  const ids = [...selectedAnchorIds.value];
  const idx = ids.indexOf(img.id);
  if (idx >= 0) {
    ids.splice(idx, 1);
    selectedAnchorIds.value = ids;
    selectedAnchorId.value =
      selectedAnchorId.value === img.id ? ids[0] ?? null : selectedAnchorId.value;
  } else {
    selectedAnchorIds.value = [...ids, img.id].sort((a, b) => a - b);
    selectedAnchorId.value = img.id;
  }
}

function selectAllAnchorCandidates() {
  const ids = anchorCandidateImages.value.map((i) => i.id);
  selectedAnchorIds.value = ids;
  selectedAnchorId.value = ids[0] ?? null;
  materialAnchor.value = null;
}

function clearAnchorSelection() {
  selectedAnchorIds.value = [];
  selectedAnchorId.value = null;
}

function resolveSetIndex(anchor) {
  if (anchor.index && /^\d+$/.test(String(anchor.index))) return String(anchor.index);
  if (typeof anchor.id === 'number') return String(anchor.id);
  return Date.now().toString().slice(-4);
}

function resetAll() {
  genStore.resetAll();
  progress.done = 0;
  progress.total = 0;
  progress.failed = 0;
  hasRestoredWork.value = false;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function pollDelay(attempt) {
  return attempt < pollHint.value.fastAttempts
    ? pollHint.value.fastIntervalMs
    : pollHint.value.intervalMs;
}

async function runPool(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  async function next() {
    while (cursor < items.length) {
      const i = cursor++;
      results[i] = await worker(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => next()));
  return results;
}

async function submitChunkRequest(prompt, size, startId, n, batchId) {
  const data = await imageGenApi.generate({ prompt, count: n, size, startId, batchId });
  if (!data.success && data.message) throw new Error(data.message);
  return data;
}

async function submitAll(prompt, total, size) {
  const chunks = [];
  for (let startId = 1; startId <= total; startId += submitChunk.value) {
    chunks.push({ startId, n: Math.min(submitChunk.value, total - startId + 1) });
  }

  let batchId = null;
  const tasks = [];
  const [first, ...rest] = chunks;

  if (first) {
    const firstData = await submitChunkRequest(prompt, size, first.startId, first.n, null);
    batchId = firstData.batchId;
    tasks.push(...(firstData.tasks || []));
    statusMessage.value = `正在提交任务（${tasks.length}/${total}）...`;
  }

  if (rest.length) {
    const restLists = await runPool(rest, SUBMIT_PARALLEL, async ({ startId, n }) => {
      const data = await submitChunkRequest(prompt, size, startId, n, batchId);
      return data.tasks || [];
    });
    tasks.push(...restLists.flat());
    statusMessage.value = `正在提交任务（${tasks.length}/${total}）...`;
  }

  return { batchId, tasks };
}

async function pollOneTask(task, batchId, sessionId = null) {
  const pollBatchId = task.batchId || batchId;
  for (let i = 0; i < pollHint.value.maxAttempts; i++) {
    if (sessionId != null && isCancelled(sessionId)) {
      throw new Error('CANCELLED');
    }
    const data = await imageGenApi.poll({ ...task, batchId: pollBatchId, role: task.role });
    if (data.status === 'completed') {
      return { ...data.image, role: task.role, setIndex: task.setIndex, label: task.label };
    }
    if (data.status === 'failed') throw new Error(data.message || '任务失败');
    await sleep(pollDelay(i));
  }
  throw new Error(`任务 ${task.taskId} 超时`);
}

function extFromMime(mime) {
  if (mime.includes('jpeg')) return 'jpg';
  if (mime.includes('webp')) return 'webp';
  if (mime.includes('gif')) return 'gif';
  return 'png';
}

function parseDataUrl(dataUrl) {
  const [meta, base64] = dataUrl.split(',');
  if (!base64) return null;
  return { base64, mime: (meta.match(/data:([^;]+)/) || [])[1] || 'image/png' };
}

function zipFileName(count, batchId) {
  return `AI批量_${count}张_含锚点_${batchId || 'batch'}.zip`;
}

/** 收集 ZIP 内所有文件（锚点候选 + 素材锚点 + ABC 套装分目录） */
function collectDownloadEntries() {
  const entries = [];
  const seen = new Set();

  function add(path, dataUrl) {
    if (!dataUrl || seen.has(dataUrl)) return;
    seen.add(dataUrl);
    entries.push({ path, dataUrl });
  }

  const sortedAnchors = [...anchorCandidateImages.value].sort((a, b) => a.id - b.id);
  const padLen = Math.max(3, String(sortedAnchors.length || 1).length);
  sortedAnchors.forEach((img, idx) => {
    const parsed = parseDataUrl(img.dataUrl);
    const ext = parsed ? extFromMime(parsed.mime) : 'png';
    add(`anchors/anchor_${String(idx + 1).padStart(padLen, '0')}_id${img.id}.${ext}`, img.dataUrl);
  });

  if (materialAnchor.value?.dataUrl) {
    const ma = materialAnchor.value;
    const parsed = parseDataUrl(ma.dataUrl);
    const ext = parsed ? extFromMime(parsed.mime) : 'png';
    const label = (ma.filename || ma.path || 'material').replace(/[/\\]/g, '_');
    add(`anchors/material_${label}.${ext}`, ma.dataUrl);
  }

  for (const set of abcSets.value) {
    const prefix = `abc_sets/set_${set.setIndex}`;
    if (set.anchor?.dataUrl) add(`${prefix}/a_anchor.png`, set.anchor.dataUrl);
    if (set.b?.dataUrl) add(`${prefix}/b_grid.png`, set.b.dataUrl);
    if (set.c?.dataUrl) add(`${prefix}/c_product.png`, set.c.dataUrl);
  }

  generatedImages.value
    .filter((img) => img.role === 'b' || img.role === 'c')
    .forEach((img) => {
      const parsed = parseDataUrl(img.dataUrl);
      const ext = parsed ? extFromMime(parsed.mime) : 'png';
      const setPart = img.setIndex ? `set_${img.setIndex}_` : '';
      add(`generated/${setPart}${img.role}_${img.id}.${ext}`, img.dataUrl);
    });

  return entries;
}

async function buildZipFromEntries(entries) {
  const zip = new JSZip();
  for (const { path, dataUrl } of entries) {
    const parsed = parseDataUrl(dataUrl);
    if (!parsed) throw new Error(`图片数据无效：${path}`);
    zip.file(path, parsed.base64, { base64: true });
  }
  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
}

function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function downloadZip() {
  const entries = collectDownloadEntries();
  if (!entries.length) {
    ElMessage.warning('没有可下载的图片');
    return;
  }
  zipping.value = true;
  const anchorN = entries.filter((e) => e.path.startsWith('anchors/')).length;
  statusMessage.value = `正在打包（锚点 ${anchorN} 张，共 ${entries.length} 个文件）...`;
  try {
    const blob = await buildZipFromEntries(entries);
    downloadBlob(blob, zipFileName(entries.length, lastBatchId.value));
    ElMessage.success(`ZIP 已开始下载（含锚点图 ${anchorN} 张）`);
  } catch (err) {
    ElMessage.error(err.message || '打包失败');
  } finally {
    zipping.value = false;
  }
}

async function handleSubmit() {
  if (!form.value.prompt.trim()) {
    ElMessage.warning('请输入图片描述');
    return;
  }

  const sessionId = ++genSessionId.value;
  loading.value = true;
  selectedAnchorId.value = null;
  selectedAnchorIds.value = [];
  materialAnchor.value = null;
  abcSets.value = [];
  statusMessage.value = '正在提交任务...';

  const total = Math.min(maxCount.value, Math.max(1, form.value.count));
  const promptUsed = form.value.prompt.trim();

  try {
    const { batchId, tasks } = await submitAll(promptUsed, total, form.value.size);
    if (!tasks.length) throw new Error('未获取到任务');

    lastBatchId.value = batchId;
    progress.total = total;
    progress.done = 0;
    progress.failed = 0;
    generatedImages.value = [];
    statusMessage.value = `已提交 ${tasks.length} 个任务，正在出图...`;

    const batchImages = [];
    await runPool(tasks, POLL_CONCURRENCY, async (task) => {
      if (isCancelled(sessionId)) return;
      try {
        const image = await pollOneTask(task, batchId, sessionId);
        if (isCancelled(sessionId)) return;
        batchImages.push({ ...image, prompt: promptUsed });
        generatedImages.value = [...batchImages].sort((a, b) => a.id - b.id);
      } catch (err) {
        if (err.message === 'CANCELLED') return;
        progress.failed += 1;
      } finally {
        progress.done += 1;
        statusMessage.value = `正在出图（${progress.done}/${total}）${progress.failed ? `，失败 ${progress.failed}` : ''}...`;
      }
    });

    if (isCancelled(sessionId)) return;

    generatedImages.value = batchImages.sort((a, b) => a.id - b.id);

    if (!batchImages.length) {
      statusMessage.value = '全部任务失败，未生成图片';
      ElMessage.error('全部任务失败');
    } else {
      if (batchImages.length === total) {
        statusMessage.value = `已完成 ${total} 张，请勾选一张或多张作为锚点 A`;
        ElMessage.success(`成功生成 ${total} 张，请勾选锚点`);
      } else {
        statusMessage.value = `成功 ${batchImages.length}/${total} 张`;
        ElMessage.warning(`部分成功：${batchImages.length}/${total} 张`);
      }
    }
  } catch (err) {
    statusMessage.value = err.message || '请求失败';
    ElMessage.error(err.message || '生成失败');
  } finally {
    loading.value = false;
  }
}

async function generateAbcForAnchor(anchor, setIndex, sessionId) {
  const setEntry = reactive({
    setIndex,
    anchor: { ...anchor, role: 'a' },
    b: null,
    c: null,
  });
  abcSets.value.unshift(setEntry);

  anchor.role = 'a';
  anchor.setIndex = setIndex;

  statusMessage.value = `套装 #${setIndex}：正在提交 B（五宫格）+ C...`;

  const res = await imageGenApi.generateAbcSet({
    anchorPrompt: anchor.prompt || form.value.prompt,
    anchorDataUrl: anchor.dataUrl,
    productDimensions: abcForm.value.productDimensions,
    productInfo: abcForm.value.productInfo,
    plantingMethod: abcForm.value.plantingMethod,
    size: form.value.size,
    cSize: abcForm.value.cSize,
    setIndex,
  });

  if (isCancelled(sessionId)) return setEntry;
  if (!res.success) throw new Error(res.message || '提交失败');

  const tasks = res.tasks || [];
  statusMessage.value = `套装 #${setIndex}：正在生成 B + C...`;

  for (const task of tasks) {
    if (isCancelled(sessionId)) break;
    try {
      const image = await pollOneTask({ ...task, batchId: res.batchId }, res.batchId, sessionId);
      if (task.role === 'b') setEntry.b = image;
      else if (task.role === 'c') setEntry.c = image;
      generatedImages.value.push(image);
    } catch (err) {
      if (err.message === 'CANCELLED') break;
      ElMessage.error(`套装 #${setIndex} ${task.label || task.role} 失败：${err.message}`);
    }
  }

  return setEntry;
}

async function handleGenerateAbc() {
  const anchors = batchAnchorList.value;
  if (!anchors.length) {
    ElMessage.warning('请先勾选一张或多张图片作为锚点 A');
    return;
  }
  if (!abcForm.value.productDimensions.trim() && !abcForm.value.productInfo.trim()) {
    ElMessage.warning('请填写产品尺寸或产品信息');
    return;
  }

  const sessionId = ++genSessionId.value;
  generatingAbc.value = true;
  let okCount = 0;

  try {
    for (let i = 0; i < anchors.length; i++) {
      if (isCancelled(sessionId)) break;
      const anchor = anchors[i];
      const setIndex = resolveSetIndex(anchor);
      abcBatchProgress.value = `${i + 1}/${anchors.length}`;
      statusMessage.value =
        anchors.length > 1
          ? `批量 B+C：第 ${i + 1}/${anchors.length} 套（锚点第 ${anchor.id} 张）...`
          : '正在生成 B + C...';

      try {
        const setEntry = await generateAbcForAnchor(anchor, setIndex, sessionId);
        if (setEntry.b && setEntry.c) okCount += 1;
      } catch (err) {
        if (err.message === 'CANCELLED' || isCancelled(sessionId)) break;
        ElMessage.error(`锚点第 ${anchor.id} 张：${err.message || '生成失败'}`);
      }
    }

    if (isCancelled(sessionId)) {
      statusMessage.value = '已取消生成';
      return;
    }

    if (anchors.length === 1) {
      const last = abcSets.value[0];
      if (last?.b && last?.c) {
        statusMessage.value = `套装 #${last.setIndex} 生成完成`;
        ElMessage.success('B 五宫格 + C 产品信息图 生成完成');
      } else {
        ElMessage.warning('部分生成失败，请重试');
      }
    } else if (okCount === anchors.length) {
      statusMessage.value = `批量完成：${okCount}/${anchors.length} 套`;
      ElMessage.success(`已生成 ${okCount} 套 B+C`);
    } else {
      statusMessage.value = `批量完成：成功 ${okCount}/${anchors.length} 套`;
      ElMessage.warning(`部分成功：${okCount}/${anchors.length} 套`);
    }
  } finally {
    generatingAbc.value = false;
    abcBatchProgress.value = '';
  }
}

async function saveAbcSet(set) {
  if (!set.anchor || !set.b || !set.c) {
    ElMessage.warning('套装未完整，请等待 B/C 生成完成');
    return;
  }
  savingSetId.value = set.setIndex;
  try {
    const res = await imageGenApi.saveAbcSet({
      anchor: set.anchor,
      bImage: set.b,
      cImage: set.c,
      setIndex: set.setIndex,
    });
    ElMessage.success(res.message || 'ABC 套装已保存');
  } catch {
    // handled by interceptor
  } finally {
    savingSetId.value = null;
  }
}

async function saveToMaterials() {
  if (!generatedImages.value.length) return;
  saving.value = true;
  try {
    const res = await imageGenApi.saveToMaterials(
      generatedImages.value.map((img) => ({
        dataUrl: img.dataUrl,
        folder: img.role || saveFolder.value,
        index: img.setIndex || img.id,
      }))
    );
    ElMessage.success(res.message || '已保存到素材库');
  } catch {
    // error handled by interceptor
  } finally {
    saving.value = false;
  }
}

function goPublish() {
  router.push('/publish');
  ElMessage.info('请在「从素材库选择」中选用刚保存的图片');
}
</script>

<style scoped>
.batch-gen .field-hint {
  font-size: 12px;
  color: var(--xhs-text-secondary);
  margin-top: 4px;
}

.api-config-panel .config-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.api-config-panel .section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 4px;
}

.config-sub {
  font-size: 13px;
  color: var(--xhs-text-secondary);
}

.config-desc {
  margin-bottom: 16px;
}

.env-template {
  padding: 16px;
  background: var(--xhs-bg);
  border-radius: var(--xhs-radius-sm);
  margin-bottom: 16px;
}

.env-template-title {
  font-size: 13px;
  color: var(--xhs-text-secondary);
  margin-bottom: 10px;
}

.env-code {
  margin: 0;
  padding: 14px 16px;
  background: #0f172a;
  color: #e2e8f0;
  border-radius: 10px;
  font-size: 13px;
  line-height: 1.7;
  overflow-x: auto;
}

.env-note {
  margin-top: 10px;
  font-size: 12px;
  color: var(--xhs-text-secondary);
}

.config-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.config-actions a {
  text-decoration: none;
}

.status-msg {
  margin-top: 12px;
  font-size: 14px;
  color: var(--xhs-text-secondary);
}

.abc-panel {
  border: 1px solid rgba(255, 36, 66, 0.15);
  background: linear-gradient(135deg, rgba(255, 36, 66, 0.03), #fff);
}

.anchor-preview {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 20px;
  padding: 12px;
  background: var(--xhs-bg);
  border-radius: var(--xhs-radius-sm);
}

.anchor-preview img {
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: 10px;
  border: 2px solid var(--xhs-primary);
}

.anchor-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
  min-width: 0;
  font-size: 13px;
  color: var(--xhs-text-secondary);
}

.anchor-info .el-button {
  align-self: flex-start;
}

.anchor-hint.batch-count {
  color: var(--xhs-primary);
  font-weight: 600;
}

.anchor-hint {
  color: var(--xhs-text-secondary);
  font-size: 14px;
  margin-bottom: 16px;
}

.abc-form {
  max-width: 640px;
}

.grid5-demo {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px dashed var(--xhs-border);
}

.demo-label {
  font-size: 12px;
  color: var(--xhs-text-secondary);
  display: block;
  margin-bottom: 10px;
}

.grid5-cell {
  aspect-ratio: 1;
  background: var(--xhs-primary-soft);
  border: 1px dashed rgba(255, 36, 66, 0.3);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  font-size: 12px;
  color: var(--xhs-primary);
  font-weight: 600;
}

.grid5-cell small {
  font-size: 10px;
  font-weight: 500;
  opacity: 0.85;
}

.grid5-cell.method {
  background: rgba(255, 152, 0, 0.12);
  border-color: rgba(255, 152, 0, 0.45);
  color: #e65100;
}

.grid5-layout {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  grid-template-rows: repeat(2, 1fr);
  gap: 6px;
  max-width: 240px;
}

.grid5-cell:nth-child(1) { grid-column: 1 / 4; }
.grid5-cell:nth-child(2) { grid-column: 4 / 7; }
.grid5-cell:nth-child(3) { grid-column: 1 / 3; }
.grid5-cell:nth-child(4) { grid-column: 3 / 5; }
.grid5-cell:nth-child(5) { grid-column: 5 / 7; }

.abc-set-card .set-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.abc-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.abc-slot {
  text-align: center;
}

.slot-tag {
  display: inline-block;
  padding: 4px 12px;
  margin-bottom: 8px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}

.slot-tag.a { background: rgba(255, 36, 66, 0.12); color: #ff2442; }
.slot-tag.b { background: rgba(245, 158, 11, 0.12); color: #d97706; }
.slot-tag.c { background: rgba(16, 185, 129, 0.12); color: #059669; }

.slot-img {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 14px;
  border: 1px solid var(--xhs-border);
}

.slot-loading {
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--xhs-bg);
  border-radius: 14px;
  font-size: 24px;
  color: var(--xhs-text-secondary);
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  margin-bottom: 20px;
  padding: 16px;
  background: var(--xhs-bg);
  border-radius: var(--xhs-radius-sm);
}

.select-hint {
  font-size: 13px;
  font-weight: 400;
  color: var(--xhs-primary);
  margin-left: 12px;
}

.image-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 16px;
}

.image-card {
  position: relative;
  border: 2px solid var(--xhs-border);
  border-radius: 14px;
  overflow: hidden;
  background: #fff;
  transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
  cursor: pointer;
}

.image-card:hover {
  transform: translateY(-3px);
  box-shadow: var(--xhs-shadow-lg);
}

.image-card.selected {
  border-color: var(--xhs-primary);
  box-shadow: 0 0 0 3px rgba(255, 36, 66, 0.15);
}

.image-card.is-b { border-color: #f59e0b; }
.image-card.is-c { border-color: #10b981; }

.select-overlay {
  position: absolute;
  top: 8px;
  left: 8px;
  right: 8px;
  z-index: 2;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  pointer-events: none;
}

.select-overlay .el-checkbox,
.select-overlay .preview-btn {
  pointer-events: auto;
}

.select-overlay .el-checkbox {
  background: rgba(255, 255, 255, 0.9);
  border-radius: 6px;
  padding: 2px 4px;
}

.overlay-tags {
  display: flex;
  align-items: center;
  gap: 6px;
  pointer-events: none;
}

.overlay-tags .preview-btn {
  pointer-events: auto;
  background: rgba(255, 255, 255, 0.92);
}

.config-head-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.config-collapsed-hint {
  font-size: 13px;
  color: var(--xhs-text-secondary);
  margin-bottom: 12px;
}

.config-collapsed-hint a {
  color: var(--xhs-primary);
}

.image-thumb {
  width: 100%;
  aspect-ratio: 1;
  display: block;
  object-fit: cover;
  user-select: none;
}

.image-meta {
  display: flex;
  justify-content: space-between;
  padding: 10px 12px;
  font-size: 12px;
  color: var(--xhs-text-secondary);
  background: #fafbfc;
}

.empty-state {
  text-align: center;
  padding: 40px 24px !important;
}

.empty-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--xhs-text);
  margin-bottom: 6px;
}

.empty-hint {
  margin-top: 4px;
  font-size: 13px;
  color: var(--xhs-text-secondary);
}
</style>
