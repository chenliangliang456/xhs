<template>
  <div class="page-container publish-page">
    <PageHero
      :title="'一键多账号发布'"
      :subtitle="'素材库选图 → AI 文案 → 多账号自动发布到小红书'"
      :image="PLACEHOLDERS.publish"
      badge="Publish"
    />

    <!-- 定时发布 -->
    <div class="card-section schedule-panel">
      <div class="section-title schedule-head">
        <span>定时发布</span>
        <el-switch v-model="schedule.enabled" active-text="已开启" inactive-text="已关闭" @change="saveSchedule" />
      </div>
      <el-alert
        v-if="scheduleStatus?.blockedReason"
        :title="scheduleStatus.blockedReason"
        type="warning"
        :closable="false"
        show-icon
        style="margin-bottom: 12px"
      />
      <el-alert
        v-else-if="!schedule.enabled"
        title="定时发布未开启：到点不会自动发帖"
        type="warning"
        :closable="false"
        show-icon
        style="margin-bottom: 12px"
      />
      <el-alert type="info" :closable="false" show-icon style="margin-bottom: 16px">
        <strong>全自动，不用选款</strong>：素材库存好 a1/b1/c1、a2/b2/c2… 后打开开关即可。
        每天 <strong>3 个时间点各发 1 条笔记</strong>（每条含 a+b+c 三张图），<strong>仅到设定时间才发</strong>，保存配置不会触发发布。
        下方「手动发布」可忽略，仅作临时试发。须保持 <code>bash start.sh</code> 运行。
      </el-alert>

      <el-form label-width="110px" class="schedule-form">
        <el-form-item label="发布时间 1">
          <el-time-picker v-model="scheduleTimes[0]" format="HH:mm" value-format="HH:mm" placeholder="选择时间" />
        </el-form-item>
        <el-form-item label="发布时间 2">
          <el-time-picker v-model="scheduleTimes[1]" format="HH:mm" value-format="HH:mm" placeholder="选择时间" />
        </el-form-item>
        <el-form-item label="发布时间 3">
          <el-time-picker v-model="scheduleTimes[2]" format="HH:mm" value-format="HH:mm" placeholder="选择时间" />
        </el-form-item>
        <el-form-item label="发布账号">
          <AccountSelector v-model="schedule.accountIds" />
        </el-form-item>
        <el-divider content-position="left">定时专用产品信息（用于 AI 文案）</el-divider>
        <el-form-item label="产品名称" required>
          <el-input v-model="schedule.productForm.productName" placeholder="与手动发布相同" />
        </el-form-item>
        <el-form-item label="产品卖点">
          <el-input v-model="schedule.productForm.sellingPoints" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="产品类型">
          <el-input v-model="schedule.productForm.productType" />
        </el-form-item>
        <el-form-item label="适用人群">
          <el-input v-model="schedule.productForm.targetAudience" />
        </el-form-item>
      </el-form>

      <div class="schedule-stats" v-if="scheduleStatus">
        <el-tag :type="schedule.enabled ? 'success' : 'info'">
          {{ schedule.enabled ? '全自动运行中' : '未开启' }}
        </el-tag>
        <el-tag type="success">完整套装 {{ scheduleStatus.completeSetCount }} 套</el-tag>
        <el-tag type="warning">待发布 {{ scheduleStatus.unusedSetCount }} 套</el-tag>
        <span class="server-time">服务器时间：{{ formatTime(scheduleStatus.serverTime) }}</span>
      </div>

      <div v-if="scheduleStatus?.todayQueue?.length" class="today-queue">
        <div class="log-title">今日自动发布队列（无需选款，系统自动排）</div>
        <div v-for="item in scheduleStatus.todayQueue" :key="item.slot" class="queue-item">
          <span class="queue-slot">{{ item.slot }}</span>
          <el-tag v-if="item.status === 'done'" type="info" size="small">今日已发</el-tag>
          <el-tag v-else-if="item.status === 'due_now'" type="danger" size="small">到点待发</el-tag>
          <el-tag v-else-if="item.status === 'pending'" type="warning" size="small">待到时</el-tag>
          <el-tag v-else-if="item.status === 'missed'" type="danger" size="small">已过点未发</el-tag>
          <el-tag v-else type="info" size="small">素材不足</el-tag>
          <span v-if="item.setIndex" class="queue-set">自动发套装 #{{ item.setIndex }}（a+b+c）</span>
        </div>
      </div>

      <div class="schedule-actions">
        <el-button type="primary" @click="saveSchedule">保存配置</el-button>
        <el-button :loading="scheduleRunning" @click="runScheduleNow">立即试发一条</el-button>
        <el-button @click="resetScheduleToday">重置今日进度</el-button>
        <el-button text @click="loadSchedule">刷新状态</el-button>
      </div>

      <div v-if="scheduleLogs.length" class="schedule-logs">
        <div class="log-title">最近定时记录</div>
        <div v-for="log in scheduleLogs" :key="log.id" class="log-item">
          <el-tag :type="log.status === 'success' ? 'success' : 'danger'" size="small">
            {{ log.status === 'success' ? '成功' : '失败' }}
          </el-tag>
          <span class="log-slot">{{ log.slot }}</span>
          <span v-if="log.setIndex">套装 #{{ log.setIndex }}</span>
          <span class="log-msg">{{ log.message }}</span>
          <span class="log-time">{{ formatTime(log.createdAt) }}</span>
        </div>
      </div>
    </div>

    <el-divider content-position="center">以下为可选：手动试发（定时发布可忽略）</el-divider>

    <WorkflowGuide
      compact
      title="手动试发步骤"
      subtitle="定时发布已配置时可跳过；从素材库选成套 a+b+c 图"
      :steps="manualPublishSteps"
      :active-step="currentStep + 1"
    />

    <el-steps :active="currentStep" finish-status="success" align-center class="steps-bar card-section">
      <el-step title="上传图片" />
      <el-step title="产品信息" />
      <el-step title="AI 文案" />
      <el-step title="选择账号" />
      <el-step title="发布结果" />
    </el-steps>

    <div v-show="currentStep === 0" class="card-section">
      <div class="section-title">选择发布图片</div>
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
          <el-input v-model="productForm.productName" placeholder="例：玻尿酸补水面膜" />
        </el-form-item>
        <el-form-item label="产品卖点" required>
          <el-input
            v-model="productForm.sellingPoints"
            type="textarea"
            :rows="3"
            placeholder="例：深层补水、温和不刺激、适合敏感肌"
          />
        </el-form-item>
        <el-form-item label="产品类型">
          <el-input v-model="productForm.productType" placeholder="例：护肤、数码、美食" />
        </el-form-item>
        <el-form-item label="适用人群">
          <el-input v-model="productForm.targetAudience" placeholder="例：20-30岁女性" />
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
        <el-button type="primary" @click="goToSelectAccounts">下一步：选择账号</el-button>
      </div>
    </div>

    <div v-show="currentStep === 3" class="card-section">
      <div class="section-title">选择发布账号</div>
      <el-alert
        title="真实发布需使用「扫码登录」添加的账号（含 Cookie）"
        type="warning"
        :closable="false"
        show-icon
        style="margin-bottom: 16px"
      >
        <template #default>
          无需配置小红书 API 地址。系统会用浏览器自动打开发布页发帖；账号密码方式无法自动发布，请先在账号管理里扫码登录。
        </template>
      </el-alert>
      <AccountSelector v-model="selectedAccountIds" />
      <div class="step-actions">
        <el-button @click="currentStep = 2">上一步</el-button>
        <el-button
          type="primary"
          :disabled="selectedAccountIds.length === 0"
          :loading="publishing"
          @click="startPublish"
        >
          开始多账号发布（{{ selectedAccountIds.length }} 个账号）
        </el-button>
      </div>
    </div>

    <div v-show="currentStep === 4" class="card-section">
      <div class="section-title">发布结果</div>
      <PublishProgress :task="publishTask" />
      <div class="step-actions">
        <el-button @click="resetAll">发布新内容</el-button>
        <el-button type="primary" @click="$router.push('/records')">查看发布记录</el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, nextTick, onMounted, onUnmounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { aiApi, publishApi, scheduleApi, buildImageSources } from '@/api';
import ImageUploader from '@/components/ImageUploader.vue';
import MaterialSelector from '@/components/MaterialSelector.vue';
import AccountSelector from '@/components/AccountSelector.vue';
import PublishProgress from '@/components/PublishProgress.vue';
import PageHero from '@/components/PageHero.vue';
import WorkflowGuide from '@/components/WorkflowGuide.vue';
import { PLACEHOLDERS } from '@/constants/placeholders';

const manualPublishSteps = [
  { num: 1, title: '选图', desc: '素材库成套 a+b+c', icon: 'Picture' },
  { num: 2, title: '产品信息', desc: '名称与卖点', icon: 'Goods' },
  { num: 3, title: 'AI 文案', desc: '生成后可编辑', icon: 'EditPen' },
  { num: 4, title: '选账号', desc: '须扫码登录', icon: 'User' },
  { num: 5, title: '发布', desc: '浏览器自动发帖', icon: 'Promotion' },
];

const currentStep = ref(0);
const imageSourceTab = ref('material');
const images = ref([]);
const uploadImages = ref([]);
const generating = ref(false);
const publishing = ref(false);
const publishTask = ref(null);
const selectedAccountIds = ref([]);
let pollTimer = null;

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

const schedule = reactive({
  enabled: false,
  accountIds: [],
  productForm: {
    productName: '',
    sellingPoints: '',
    productType: '',
    targetAudience: '',
    style: '口语化种草风',
  },
});
const scheduleTimes = ref(['09:00', '14:00', '20:00']);
const scheduleStatus = ref(null);
const scheduleLogs = ref([]);
const scheduleRunning = ref(false);
let schedulePollTimer = null;

function formatTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('zh-CN');
}

async function loadSchedule() {
  try {
    const res = await scheduleApi.get();
    const data = res.data;
    schedule.enabled = data.enabled;
    schedule.accountIds = [...(data.accountIds || [])];
    Object.assign(schedule.productForm, data.productForm || {});
    scheduleTimes.value = [
      data.times?.[0] || '09:00',
      data.times?.[1] || '14:00',
      data.times?.[2] || '20:00',
    ];
    scheduleStatus.value = data;
    const logsRes = await scheduleApi.logs(20);
    scheduleLogs.value = logsRes.data || [];
  } catch {
    // handled
  }
}

async function saveSchedule() {
  if (!schedule.productForm.productName?.trim()) {
    ElMessage.warning('请填写产品名称');
    return;
  }
  if (!schedule.accountIds.length) {
    ElMessage.warning('请选择发布账号');
    return;
  }
  if (!scheduleTimes.value.some(Boolean)) {
    ElMessage.warning('请设置至少一个发布时间');
    return;
  }

  try {
    const res = await scheduleApi.update({
      enabled: schedule.enabled,
      times: scheduleTimes.value.filter(Boolean),
      accountIds: schedule.accountIds,
      productForm: { ...schedule.productForm },
    });
    scheduleStatus.value = res.data;
    ElMessage.success(
      schedule.enabled
        ? '配置已保存，将在设定时间点自动发布（保存不会立刻发帖）'
        : '配置已保存，请打开上方开关后才会到点自动发布'
    );
    await loadSchedule();
  } catch {
    // handled
  }
}

async function resetScheduleToday() {
  try {
    await ElMessageBox.confirm(
      '将清空今日 3 个时间点的发布记录，队列恢复为按 #1→#2→#3 重新排。已过时间点需改到未来或明天再自动发。是否继续？',
      '重置今日进度',
      { type: 'warning' }
    );
  } catch {
    return;
  }
  try {
    const res = await scheduleApi.resetToday();
    scheduleStatus.value = res.data;
    ElMessage.success(res.message || '已重置');
    await loadSchedule();
  } catch {
    // handled
  }
}

async function runScheduleNow() {
  if (!schedule.productForm.productName?.trim()) {
    ElMessage.warning('请先填写定时发布的产品名称');
    return;
  }
  if (!schedule.accountIds.length) {
    ElMessage.warning('请选择发布账号');
    return;
  }
  await saveSchedule();
  scheduleRunning.value = true;
  try {
    const res = await scheduleApi.runNow({ slot: scheduleTimes.value[0] });
    if (res.success) {
      ElMessage.success(res.message || '试发完成');
    } else {
      ElMessage.error(res.message || '试发失败');
    }
    await loadSchedule();
  } finally {
    scheduleRunning.value = false;
  }
}

onMounted(() => {
  loadSchedule();
  schedulePollTimer = setInterval(loadSchedule, 60000);
});

onUnmounted(() => {
  if (schedulePollTimer) clearInterval(schedulePollTimer);
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
    // 错误已处理
  } finally {
    generating.value = false;
  }
}

function goToSelectAccounts() {
  if (!copyForm.title || !copyForm.content) {
    ElMessage.warning('请完善标题和正文');
    return;
  }
  currentStep.value = 3;
}

async function startPublish() {
  publishing.value = true;
  try {
    const res = await publishApi.create({
      title: copyForm.title,
      content: copyForm.content,
      tags: copyForm.tags,
      imageSources: buildImageSources(images.value),
      accountIds: selectedAccountIds.value,
    });

    publishTask.value = res.data.task;
    currentStep.value = 4;
    startPolling(res.data.taskId);
    ElMessage.success('发布任务已启动');
  } catch {
    // 错误已处理
  } finally {
    publishing.value = false;
  }
}

function startPolling(taskId) {
  stopPolling();
  pollTimer = setInterval(async () => {
    try {
      const res = await publishApi.getStatus(taskId);
      publishTask.value = res.data;

      if (['completed', 'failed', 'partial'].includes(res.data.status)) {
        stopPolling();
      }
    } catch {
      stopPolling();
    }
  }, 2000);
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

function copyText(text) {
  navigator.clipboard.writeText(text);
  ElMessage.success('已复制到剪贴板');
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
  selectedAccountIds.value = [];
  publishTask.value = null;
  stopPolling();
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
}

.tags-editor {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
}

.schedule-panel .schedule-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.schedule-form {
  max-width: 640px;
}

.field-hint-inline {
  margin-left: 12px;
  font-size: 12px;
  color: var(--xhs-text-secondary);
}

.schedule-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  margin: 16px 0;
  font-size: 13px;
}

.server-time {
  color: var(--xhs-text-secondary);
  margin-left: auto;
}

.schedule-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.schedule-logs {
  border-top: 1px solid var(--xhs-border);
  padding-top: 16px;
}

.log-title {
  font-weight: 600;
  margin-bottom: 10px;
  font-size: 14px;
}

.today-queue {
  margin: 12px 0 16px;
  padding: 12px 14px;
  background: var(--xhs-bg);
  border-radius: var(--xhs-radius-sm);
}

.queue-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 0;
  font-size: 13px;
}

.queue-slot {
  font-weight: 600;
  min-width: 48px;
  font-variant-numeric: tabular-nums;
}

.queue-set {
  color: var(--xhs-text-secondary);
}

.log-item {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px dashed var(--xhs-border);
  font-size: 13px;
}

.log-msg {
  flex: 1;
  min-width: 200px;
  color: var(--xhs-text-secondary);
}

.log-time {
  font-size: 12px;
  color: #909399;
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
</style>
