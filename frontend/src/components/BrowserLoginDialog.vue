<template>
  <el-dialog
    v-model="visible"
    :title="refreshAccountId ? `刷新登录：${refreshAccountName || '账号'}` : '浏览器登录（自动获取 Cookie）'"
    width="480px"
    :close-on-click-modal="false"
    destroy-on-close
    @close="handleClose"
  >
    <el-alert
      type="success"
      :closable="false"
      show-icon
      title="不用找 Cookie，不用按 F12"
      style="margin-bottom: 16px"
    >
      <template #default>
        点击开始后，Mac 会<strong>弹出一个 Chrome 窗口</strong>。登录成功后，登录态会<strong>永久保存在本机</strong>（backend/profiles/），系统每 6 小时自动续期。
      </template>
    </el-alert>

    <el-form label-width="80px">
      <el-form-item label="账号名称">
        <el-input v-model="accountName" placeholder="留空则自动命名" />
      </el-form-item>
    </el-form>

    <div v-if="loading" class="status-box">
      <el-icon class="is-loading" :size="28"><Loading /></el-icon>
      <p>正在打开浏览器...</p>
    </div>

    <div v-else-if="sessionId" class="status-box">
      <el-tag :type="statusTagType">{{ statusText }}</el-tag>
      <p class="status-msg">{{ statusMessage }}</p>
      <p v-if="status === 'waiting'" class="hint">若没看到窗口，请检查 Dock 栏是否有 Chrome 图标</p>
      <p v-if="countdown > 0" class="countdown">剩余 {{ countdown }} 秒</p>
    </div>

    <el-empty v-else-if="error" :description="error">
      <el-button type="primary" @click="startLogin">重试</el-button>
    </el-empty>

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button v-if="!sessionId && !loading" type="primary" @click="startLogin">
        打开浏览器登录
      </el-button>
      <el-button
        v-if="status === 'success'"
        type="primary"
        :loading="confirming"
        @click="confirmLogin"
      >
        确认添加账号
      </el-button>
      <el-button v-else-if="sessionId && status === 'waiting'" @click="startLogin">重新打开</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch, onUnmounted } from 'vue';
import { Loading } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { accountCookieApi } from '@/api';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  refreshAccountId: { type: String, default: '' },
  refreshAccountName: { type: String, default: '' },
});

const emit = defineEmits(['update:modelValue', 'success']);

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
});

const loading = ref(false);
const confirming = ref(false);
const sessionId = ref('');
const status = ref('waiting');
const statusMessage = ref('');
const accountName = ref('');
const error = ref('');
const countdown = ref(0);

let pollTimer = null;
let countdownTimer = null;

const statusText = computed(() => {
  const map = { waiting: '等待登录', success: '已获取 Cookie', expired: '已超时' };
  return map[status.value] || status.value;
});

const statusTagType = computed(() => {
  const map = { waiting: 'info', success: 'success', expired: 'danger' };
  return map[status.value] || 'info';
});

watch(visible, (val) => {
  if (val) {
    if (props.refreshAccountName) {
      accountName.value = props.refreshAccountName;
    }
    startLogin();
  } else stopAll();
});

async function startLogin() {
  stopAll();
  loading.value = true;
  error.value = '';
  sessionId.value = '';
  status.value = 'waiting';
  statusMessage.value = '正在打开浏览器...';

  try {
    const res = await accountCookieApi.start(props.refreshAccountId || undefined);
    sessionId.value = res.data.sessionId;
    statusMessage.value = res.data.message || res.message;
    countdown.value = res.data.expiresIn || 300;
    startPolling();
    startCountdown();
  } catch (err) {
    error.value = err.response?.data?.message || err.message || '打开浏览器失败';
  } finally {
    loading.value = false;
  }
}

function startPolling() {
  pollTimer = setInterval(async () => {
    if (!sessionId.value) return;
    try {
      const res = await accountCookieApi.getStatus(sessionId.value);
      const data = res.data;
      status.value = data.status;
      statusMessage.value = data.message || '';
      if (data.nickname && !accountName.value) {
        accountName.value = data.nickname;
      }
      if (data.status === 'success') {
        stopPolling();
        ElMessage.success('登录成功，请点击「确认添加账号」');
      }
      if (data.status === 'expired') {
        stopPolling();
      }
    } catch {
      stopPolling();
    }
  }, 2000);
}

function startCountdown() {
  countdownTimer = setInterval(() => {
    if (countdown.value > 0) countdown.value -= 1;
    else stopCountdown();
  }, 1000);
}

async function confirmLogin() {
  confirming.value = true;
  try {
    const payload = { name: accountName.value };
    if (props.refreshAccountId) {
      payload.accountId = props.refreshAccountId;
    }
    const res = await accountCookieApi.confirm(sessionId.value, payload);
    ElMessage.success(res.message || '账号添加成功');
    emit('success');
    visible.value = false;
  } catch {
    // handled
  } finally {
    confirming.value = false;
  }
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

function stopCountdown() {
  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }
}

function stopAll() {
  stopPolling();
  stopCountdown();
  if (sessionId.value) {
    accountCookieApi.cancel(sessionId.value).catch(() => {});
    sessionId.value = '';
  }
}

function handleClose() {
  stopAll();
  visible.value = false;
}

onUnmounted(stopAll);
</script>

<style scoped>
.status-box {
  text-align: center;
  padding: 24px 0;
  color: #606266;
}

.status-msg {
  margin-top: 12px;
  font-size: 14px;
}

.hint {
  margin-top: 8px;
  font-size: 13px;
  color: #e6a23c;
}

.countdown {
  margin-top: 6px;
  font-size: 12px;
  color: #c0c4cc;
}
</style>
