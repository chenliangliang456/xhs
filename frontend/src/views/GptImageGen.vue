<template>
  <div class="page-container gpt-open-page">
    <PageHero
      title="GPT 开放生图"
      subtitle="无额度限制 · 主生图额度用尽时的备用通道 · 支持上传修改与可见思考模式"
      :image="PLACEHOLDERS.batchImage"
      badge="Open · GPT"
    />

    <el-alert
      v-if="!health.imageConfigured"
      title="未配置 GPT 开放生图 API"
      type="warning"
      :closable="false"
      show-icon
      style="margin-bottom: 16px"
    >
      请在 backend/.env 配置 <code>GPT_OPEN_IMAGE_API_BASE_URL</code> 与 <code>GPT_OPEN_IMAGE_API_KEY</code>（可复用 IMAGE_GEN 配置）
    </el-alert>

    <el-alert
      v-if="health.thinkConfigured && health.thinkAvailable === false"
      title="思考模式暂不可用：请配置 DeepSeek API Key"
      type="info"
      :closable="false"
      show-icon
      style="margin-bottom: 16px"
    >
      在「系统设置 → DeepSeek AI」或「GPT 开放生图 → 思考模式」填入 DeepSeek 密钥后保存即可；生图仍走 apimart，不受影响。
    </el-alert>

    <div class="gpt-layout">
      <div class="gpt-main card-section">
        <el-form label-position="top">
          <el-form-item label="生成模式">
            <div class="chip-group">
              <el-button
                size="small"
                :type="form.mode === 'generate' ? 'primary' : 'default'"
                @click="form.mode = 'generate'"
              >
                文生图
              </el-button>
              <el-button
                size="small"
                :type="form.mode === 'edit' ? 'primary' : 'default'"
                @click="form.mode = 'edit'"
              >
                上传修改
              </el-button>
            </div>
            <p class="field-hint">
              {{ form.mode === 'edit' ? '上传参考图 + 描述修改内容（图生图）' : '纯文字描述生成图片' }}
            </p>
          </el-form-item>

          <el-form-item :label="form.mode === 'edit' ? '参考图（必填）' : '参考图（可选）'">
            <div class="upload-zone">
              <el-upload
                drag
                :auto-upload="false"
                :show-file-list="false"
                accept="image/*"
                :disabled="generating || thinking"
                @change="onUploadChange"
              >
                <el-icon class="upload-icon"><UploadFilled /></el-icon>
                <div>拖拽或点击上传</div>
              </el-upload>
              <div v-if="form.referencePreview" class="ref-preview">
                <el-image :src="form.referencePreview" fit="contain" class="ref-img" />
                <div class="ref-actions">
                  <el-button size="small" text type="primary" @click="downloadReference">下载参考图</el-button>
                  <el-button size="small" text type="danger" @click="clearReference">移除</el-button>
                </div>
              </div>
            </div>
          </el-form-item>

          <el-form-item label="描述 / 修改说明">
            <el-input
              v-model="form.prompt"
              type="textarea"
              :rows="4"
              placeholder="描述你想生成的画面，或说明要如何修改上传的图片..."
              :disabled="generating"
            />
          </el-form-item>

          <el-form-item label="尺寸">
            <el-select v-model="form.size" style="width: 180px" :disabled="generating">
              <el-option label="1:1 方形" value="1:1" />
              <el-option label="3:4 竖屏" value="3:4" />
              <el-option label="9:16 竖屏" value="9:16" />
              <el-option label="4:3 横屏" value="4:3" />
              <el-option label="16:9 宽屏" value="16:9" />
            </el-select>
          </el-form-item>

          <el-form-item label="思考模式">
            <div class="think-row">
              <el-switch
                v-model="form.thinkingEnabled"
                active-text="开启（可见思考过程）"
                :disabled="!health.thinkConfigured || health.thinkAvailable === false || generating"
              />
              <el-tag v-if="!health.thinkConfigured" size="small" type="info">需配置 Chat API</el-tag>
              <el-tag v-else-if="health.thinkAvailable === false" size="small" type="warning">仅有生图权限</el-tag>
            </div>
            <p class="field-hint">开启后 AI 会先展示思考过程，再自动优化英文 prompt 用于生图</p>
          </el-form-item>

          <el-form-item>
            <el-button
              type="primary"
              :loading="generating || thinking"
              :disabled="!canGenerate"
              @click="handleGenerate"
            >
              {{ thinking ? '思考中...' : generating ? '生成中...' : '开始生成' }}
            </el-button>
            <el-button
              v-if="generating || thinking"
              type="danger"
              plain
              @click="handleCancel"
            >
              取消生成
            </el-button>
            <el-button v-if="result?.dataUrl" @click="useResultAsReference">用结果继续修改</el-button>
          </el-form-item>
        </el-form>

        <div v-if="statusMessage" class="status-line">{{ statusMessage }}</div>
      </div>

      <div class="gpt-side">
        <div v-if="form.thinkingEnabled" class="card-section think-panel">
          <div class="panel-head">
            <span class="section-title">思考过程</span>
            <el-tag v-if="thinking" size="small" type="warning" effect="plain">进行中</el-tag>
          </div>
          <div ref="thinkBoxRef" class="think-box">
            <p v-if="!thinkingText && !thinking" class="think-placeholder">开启思考模式后，AI 推理过程会实时显示在这里</p>
            <pre v-else class="think-content">{{ thinkingText }}</pre>
          </div>
          <div v-if="finalPrompt" class="final-prompt">
            <div class="final-prompt-head">
              <span class="label">优化后的 Prompt</span>
              <el-button size="small" text type="primary" @click="downloadThinking">下载思考内容</el-button>
            </div>
            <p>{{ finalPrompt }}</p>
          </div>
          <div v-else-if="thinkingText" class="final-prompt">
            <div class="final-prompt-head">
              <span class="label">思考过程</span>
              <el-button size="small" text type="primary" @click="downloadThinking">下载思考内容</el-button>
            </div>
          </div>
        </div>

        <div class="card-section result-panel">
          <div class="panel-head">
            <span class="section-title">生成结果</span>
            <el-button
              v-if="result?.dataUrl"
              size="small"
              text
              type="primary"
              @click="downloadImage(result)"
            >
              下载
            </el-button>
          </div>
          <div v-if="generating && !result" class="result-loading">
            <el-icon class="is-loading"><Loading /></el-icon>
            <span>正在生成，C 类复杂图可能需 1～3 分钟...</span>
          </div>
          <template v-else-if="result?.dataUrl">
            <el-image :src="result.dataUrl" fit="contain" class="result-img" :preview-src-list="[result.dataUrl]" />
            <div class="result-actions">
              <el-button size="small" type="primary" @click="downloadImage(result)">下载图片</el-button>
              <el-button size="small" @click="saveToMaterials" :loading="saving">存入素材库</el-button>
            </div>
          </template>
          <el-empty v-else description="生成结果将显示在这里" :image-size="80" />
        </div>

        <div v-if="history.length" class="card-section history-panel">
          <div class="panel-head">
            <span class="section-title">历史记录</span>
            <div class="panel-head-actions">
              <el-button size="small" text type="primary" @click="downloadAllHistory">全部下载</el-button>
              <el-button size="small" text @click="history = []">清空</el-button>
            </div>
          </div>
          <div class="history-grid">
            <div
              v-for="(item, idx) in history"
              :key="idx"
              class="history-item"
              @click="loadHistory(item)"
            >
              <el-image :src="item.dataUrl" fit="cover" />
              <div class="history-overlay" @click.stop>
                <el-button size="small" circle @click="downloadImage(item, idx)">
                  <el-icon><Download /></el-icon>
                </el-button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick } from 'vue';
import { ElMessage } from 'element-plus';
import { UploadFilled, Loading, Download } from '@element-plus/icons-vue';
import PageHero from '@/components/PageHero.vue';
import { PLACEHOLDERS } from '@/constants/placeholders';
import { gptOpenApi, imageGenApi } from '@/api';
import { compressDataUrl } from '@/utils/compressDataUrl';
import { pollGptOpenTask, streamGptThink } from '@/utils/gptImagePoll';
import {
  downloadDataUrlImage,
  downloadTextFile,
  buildImageFileName,
  buildTextFileName,
  extFromMime,
  parseDataUrl,
} from '@/utils/downloadImage';

const health = ref({
  imageConfigured: false,
  thinkConfigured: false,
  thinkAvailable: null,
  pollHint: {},
});

const form = reactive({
  mode: 'generate',
  prompt: '',
  size: '3:4',
  referencePreview: '',
  referenceDataUrl: '',
  thinkingEnabled: false,
});

const generating = ref(false);
const thinking = ref(false);
const saving = ref(false);
const statusMessage = ref('');
const thinkingText = ref('');
const finalPrompt = ref('');
const result = ref(null);
const history = ref([]);
const thinkBoxRef = ref(null);

let genSessionId = 0;
let thinkAbort = null;
let pollAbort = null;

const canGenerate = computed(() => {
  if (!health.value.imageConfigured) return false;
  if (!form.prompt.trim()) return false;
  if (form.mode === 'edit' && !form.referenceDataUrl) return false;
  return true;
});

onMounted(async () => {
  try {
    const res = await gptOpenApi.health();
    health.value = {
      imageConfigured: !!res.imageConfigured,
      thinkConfigured: !!res.thinkConfigured,
      thinkAvailable: res.thinkAvailable ?? null,
      pollHint: res.pollHint || {},
    };
    if (res.thinkAvailable) {
      form.thinkingEnabled = true;
    }
  } catch {
    // ignore
  }
});

function isCancelled(sessionId) {
  return sessionId !== genSessionId;
}

function scrollThinkBox() {
  nextTick(() => {
    const el = thinkBoxRef.value;
    if (el) el.scrollTop = el.scrollHeight;
  });
}

async function onUploadChange(uploadFile) {
  const raw = uploadFile.raw;
  if (!raw) return;
  const reader = new FileReader();
  reader.onload = async () => {
    const compressed = await compressDataUrl(reader.result, { maxSide: 1920, quality: 0.85 });
    form.referenceDataUrl = compressed;
    form.referencePreview = compressed;
  };
  reader.readAsDataURL(raw);
}

function clearReference() {
  form.referencePreview = '';
  form.referenceDataUrl = '';
}

function handleCancel() {
  genSessionId += 1;
  thinkAbort?.();
  pollAbort?.abort();
  thinkAbort = null;
  pollAbort = null;
  generating.value = false;
  thinking.value = false;
  statusMessage.value = '已取消';
  ElMessage.info('已取消生成');
}

async function runThinking(sessionId) {
  if (!form.thinkingEnabled || !health.value.thinkConfigured || health.value.thinkAvailable === false) {
    return form.prompt.trim();
  }

  thinking.value = true;
  thinkingText.value = '';
  finalPrompt.value = '';
  statusMessage.value = '思考模式：正在分析需求...';

  return new Promise((resolve, reject) => {
    const stream = streamGptThink(
      {
        prompt: form.prompt.trim(),
        mode: form.mode,
      },
      {
        onDelta: (_delta, full) => {
          if (isCancelled(sessionId)) return;
          thinkingText.value = full;
          scrollThinkBox();
        },
        onDone: ({ thinking: t, finalPrompt: fp }) => {
          if (isCancelled(sessionId)) {
            reject(new Error('CANCELLED'));
            return;
          }
          thinkingText.value = t || thinkingText.value;
          finalPrompt.value = fp || '';
          thinking.value = false;
          resolve(fp || form.prompt.trim());
        },
        onError: (err) => {
          thinking.value = false;
          if (err.name === 'AbortError' || isCancelled(sessionId)) {
            reject(new Error('CANCELLED'));
            return;
          }
          ElMessage.warning(`思考模式失败，将使用原始描述：${err.message}`);
          resolve(form.prompt.trim());
        },
      }
    );
    thinkAbort = stream.abort;
  });
}

async function handleGenerate() {
  if (!canGenerate.value) return;

  const sessionId = ++genSessionId;
  generating.value = true;
  result.value = null;
  pollAbort = new AbortController();

  try {
    let promptToUse = form.prompt.trim();

    if (form.thinkingEnabled) {
      promptToUse = await runThinking(sessionId);
      if (isCancelled(sessionId)) return;
    }

    statusMessage.value = '正在提交生图任务...';

    const res = await gptOpenApi.generate({
      prompt: promptToUse,
      mode: form.mode,
      size: form.size,
      referenceImage: form.referenceDataUrl || undefined,
    });

    if (isCancelled(sessionId)) return;
    if (!res.success) throw new Error(res.message || '提交失败');

    const task = res.tasks?.[0];
    if (!task) throw new Error('未返回任务');

    statusMessage.value = '任务已提交，正在生成（请耐心等待）...';

    const image = await pollGptOpenTask(task, res.batchId, {
      pollHint: health.value.pollHint,
      getSessionId: () => genSessionId,
      isCancelled: () => isCancelled(sessionId),
      signal: pollAbort.signal,
    });

    if (isCancelled(sessionId)) return;

    result.value = image;
    history.value.unshift({ ...image, prompt: promptToUse, mode: form.mode });
    if (history.value.length > 12) history.value.pop();
    statusMessage.value = '生成完成';
    ElMessage.success('生成成功');
  } catch (err) {
    if (err.message === 'CANCELLED') return;
    statusMessage.value = err.message || '生成失败';
    ElMessage.error(err.message || '生成失败');
  } finally {
    generating.value = false;
    thinking.value = false;
    thinkAbort = null;
    pollAbort = null;
  }
}

function useResultAsReference() {
  if (!result.value?.dataUrl) return;
  form.mode = 'edit';
  form.referenceDataUrl = result.value.dataUrl;
  form.referencePreview = result.value.dataUrl;
  form.prompt = '在保持整体风格的基础上优化细节，提升质感';
  ElMessage.success('已载入结果图，可继续修改');
}

function downloadImage(img, index) {
  if (!img?.dataUrl) {
    ElMessage.warning('暂无图片可下载');
    return;
  }
  try {
    const parsed = parseDataUrl(img.dataUrl);
    const ext = parsed ? extFromMime(parsed.mime) : 'png';
    const name = img.fileName || buildImageFileName(`gpt-open${index != null ? `_${index + 1}` : ''}`, ext);
    downloadDataUrlImage(img.dataUrl, name);
    ElMessage.success('已开始下载');
  } catch (err) {
    ElMessage.error(err.message || '下载失败');
  }
}

function downloadReference() {
  if (!form.referenceDataUrl) return;
  try {
    downloadDataUrlImage(form.referenceDataUrl, buildImageFileName('gpt-ref'));
    ElMessage.success('参考图已开始下载');
  } catch (err) {
    ElMessage.error(err.message || '下载失败');
  }
}

function downloadThinking() {
  const parts = [];
  if (thinkingText.value) parts.push('【思考过程】\n' + thinkingText.value);
  if (finalPrompt.value) parts.push('\n【优化 Prompt】\n' + finalPrompt.value);
  if (!parts.length) {
    ElMessage.warning('暂无思考内容');
    return;
  }
  downloadTextFile(parts.join('\n'), buildTextFileName());
  ElMessage.success('思考内容已开始下载');
}

function downloadAllHistory() {
  if (!history.value.length) return;
  history.value.forEach((item, idx) => {
    setTimeout(() => downloadImage(item, idx), idx * 200);
  });
  ElMessage.success(`正在下载 ${history.value.length} 张历史图片`);
}

function loadHistory(item) {
  result.value = item;
}

async function saveToMaterials() {
  if (!result.value?.dataUrl) return;
  saving.value = true;
  try {
    await imageGenApi.saveOneToMaterials({
      dataUrl: result.value.dataUrl,
      folder: 'a',
    });
    ElMessage.success('已保存到素材库');
  } catch (err) {
    ElMessage.error(err.message || '保存失败');
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.gpt-layout {
  display: grid;
  grid-template-columns: 1fr 380px;
  gap: 20px;
  align-items: start;
}

@media (max-width: 960px) {
  .gpt-layout {
    grid-template-columns: 1fr;
  }
}

.chip-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.field-hint {
  margin: 8px 0 0;
  font-size: 12px;
  color: var(--xhs-text-secondary);
}

.upload-zone {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  flex-wrap: wrap;
}

.upload-zone :deep(.el-upload-dragger) {
  width: 200px;
  padding: 20px;
}

.upload-icon {
  font-size: 32px;
  color: var(--xhs-primary);
  margin-bottom: 8px;
}

.ref-preview {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ref-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.ref-img {
  width: 160px;
  height: 160px;
  border-radius: 8px;
  border: 1px solid var(--xhs-border);
}

.think-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.status-line {
  margin-top: 12px;
  font-size: 13px;
  color: var(--xhs-text-secondary);
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.think-box {
  max-height: 280px;
  overflow-y: auto;
  background: #f8fafc;
  border-radius: 8px;
  padding: 12px;
  border: 1px solid var(--xhs-border);
}

.think-placeholder {
  color: var(--xhs-text-secondary);
  font-size: 13px;
  margin: 0;
}

.think-content {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 13px;
  line-height: 1.6;
  font-family: inherit;
}

.final-prompt {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed var(--xhs-border);
}

.final-prompt .label {
  font-size: 12px;
  color: var(--xhs-text-secondary);
}

.final-prompt p {
  margin: 6px 0 0;
  font-size: 13px;
  line-height: 1.5;
}

.result-loading {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 40px 0;
  justify-content: center;
  color: var(--xhs-text-secondary);
}

.result-img {
  width: 100%;
  max-height: 420px;
  border-radius: 8px;
}

.result-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.history-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.final-prompt-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.panel-head-actions {
  display: flex;
  gap: 4px;
  align-items: center;
}

.history-item {
  position: relative;
  aspect-ratio: 1;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  border: 2px solid transparent;
}

.history-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.35);
  opacity: 0;
  transition: opacity 0.2s;
}

.history-item:hover .history-overlay {
  opacity: 1;
}

.history-item:hover {
  border-color: var(--xhs-primary);
}
</style>
