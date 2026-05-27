<template>
  <el-dialog
    v-model="visible"
    title="扫码登录小红书"
    width="420px"
    :close-on-click-modal="false"
    destroy-on-close
    @close="handleClose"
  >
    <div class="qr-login-body">
      <el-form label-width="80px" style="margin-bottom: 16px">
        <el-form-item label="账号名称">
          <el-input v-model="accountName" placeholder="留空则自动使用小红书昵称" />
        </el-form-item>
      </el-form>

      <div v-if="loading" class="qr-loading">
        <el-icon class="is-loading" :size="32"><Loading /></el-icon>
        <p>正在获取二维码...</p>
      </div>

      <template v-else-if="qrCode">
        <div class="qr-box">
          <img :src="qrCode" alt="登录二维码" class="qr-image" />
          <div v-if="status === 'waiting'" class="qr-mask scan-line" />
        </div>

        <div class="qr-status">
          <el-tag :type="statusTagType" size="small">{{ statusText }}</el-tag>
          <span class="status-msg">{{ statusMessage }}</span>
        </div>

        <p class="qr-tip">打开小红书 App → 扫一扫 → 扫描上方二维码</p>
        <p v-if="countdown > 0" class="qr-countdown">二维码 {{ countdown }} 秒后过期</p>
      </template>

      <el-empty v-else-if="error" :description="error">
        <el-button type="primary" @click="startLogin">重试</el-button>
      </el-empty>
    </div>

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button
        v-if="status === 'success'"
        type="primary"
        :loading="confirming"
        @click="confirmLogin"
      >
        确认添加账号
      </el-button>
      <el-button v-else-if="!loading && qrCode" @click="startLogin">刷新二维码</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch, onUnmounted } from 'vue';
import { Loading } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { accountQrApi } from '@/api';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
});

const emit = defineEmits(['update:modelValue', 'success']);

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
});

const loading = ref(false);
const confirming = ref(false);
const qrCode = ref('');
const sessionId = ref('');
const status = ref('waiting');
const statusMessage = ref('等待扫码...');
const accountName = ref('');
const error = ref('');
const countdown = ref(0);

let pollTimer = null;
let countdownTimer = null;

const statusText = computed(() => {
  const map = {
    waiting: '等待扫码',
    success: '登录成功',
    expired: '已过期',
  };
  return map[status.value] || status.value;
});

const statusTagType = computed(() => {
  const map = { waiting: 'info', success: 'success', expired: 'danger' };
  return map[status.value] || 'info';
});

watch(visible, (val) => {
  if (val) startLogin();
  else stopAll();
});

async function startLogin() {
  stopAll();
  loading.value = true;
  error.value = '';
  qrCode.value = '';
  status.value = 'waiting';
  statusMessage.value = '等待扫码...';

  try {
    const res = await accountQrApi.start();
    sessionId.value = res.data.sessionId;
    qrCode.value = res.data.qrCode;
    countdown.value = res.data.expiresIn || 120;
    startPolling();
    startCountdown();
  } catch (err) {
    error.value = err.response?.data?.message || err.message || '获取二维码失败';
  } finally {
    loading.value = false;
  }
}

function startPolling() {
  pollTimer = setInterval(async () => {
    if (!sessionId.value) return;
    try {
      const res = await accountQrApi.getStatus(sessionId.value);
      const data = res.data;

      status.value = data.status;
      statusMessage.value = data.message || '';
      if (data.qrCode && data.status === 'waiting') {
        qrCode.value = data.qrCode;
      }
      if (data.nickname && !accountName.value) {
        accountName.value = data.nickname;
      }
      if (data.status === 'success') {
        stopPolling();
        ElMessage.success('扫码成功，请点击确认添加账号');
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
    const res = await accountQrApi.confirm(sessionId.value, {
      name: accountName.value,
    });
    ElMessage.success(res.message || '账号添加成功');
    emit('success');
    visible.value = false;
  } catch {
    // 错误已处理
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
    accountQrApi.cancel(sessionId.value).catch(() => {});
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
.qr-login-body {
  text-align: center;
}

.qr-loading {
  padding: 40px 0;
  color: #909399;
}

.qr-loading p {
  margin-top: 12px;
}

.qr-box {
  position: relative;
  display: inline-block;
  padding: 12px;
  border: 1px solid #ebeef5;
  border-radius: 12px;
  background: #fff;
}

.qr-image {
  width: 220px;
  height: 220px;
  object-fit: contain;
  display: block;
}

.qr-status {
  margin-top: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.status-msg {
  font-size: 13px;
  color: #606266;
}

.qr-tip {
  margin-top: 12px;
  font-size: 13px;
  color: #909399;
}

.qr-countdown {
  margin-top: 6px;
  font-size: 12px;
  color: #c0c4cc;
}
</style>
