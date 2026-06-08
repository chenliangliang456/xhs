<template>
  <div class="login-page">
    <div class="login-visual">
      <img :src="PLACEHOLDERS.login" alt="" class="visual-bg" />
      <div class="visual-overlay" />
      <div class="visual-content">
        <div class="visual-badge">创作工作台</div>
        <h2>从小红书内容<br />到 ABC 成套素材</h2>
        <p>AI 批量生图 · DeepSeek 文案 · 复制后手动发布</p>
        <div class="feature-list">
          <div v-for="f in features" :key="f" class="feature-item">
            <el-icon><CircleCheck /></el-icon>
            <span>{{ f }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="login-form-panel">
      <div class="login-card">
        <div class="login-header">
          <div class="logo-mark">红</div>
          <h1>欢迎回来</h1>
          <p>登录你的创作工作台</p>
        </div>

        <el-form ref="formRef" :model="form" :rules="rules" @submit.prevent="handleLogin">
          <el-form-item prop="username">
            <el-input
              v-model="form.username"
              placeholder="用户名"
              size="large"
              prefix-icon="User"
            />
          </el-form-item>
          <el-form-item prop="password">
            <el-input
              v-model="form.password"
              type="password"
              placeholder="密码"
              size="large"
              prefix-icon="Lock"
              show-password
              @keyup.enter="handleLogin"
            />
          </el-form-item>
          <el-form-item>
            <el-button
              type="primary"
              size="large"
              :loading="loading"
              class="login-btn"
              @click="handleLogin"
            >
              进入工作台
            </el-button>
          </el-form-item>
        </el-form>

        <div class="login-tip">
          默认账号 <code>admin</code> / <code>admin123</code>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { CircleCheck } from '@element-plus/icons-vue';
import { useUserStore } from '@/stores/user';
import { PLACEHOLDERS } from '@/constants/placeholders';

const router = useRouter();
const userStore = useUserStore();
const formRef = ref(null);
const loading = ref(false);

const features = [
  'AI 批量文生图，ABC 套装一键生成',
  '素材库 A/B/C 成套管理',
  'DeepSeek 智能种草文案',
  '复制文案 · 手机 App 手动发布',
];

const form = reactive({
  username: 'admin',
  password: 'admin123',
});

const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
};

async function handleLogin() {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;

  loading.value = true;
  try {
    await userStore.login(form);
    ElMessage.success('登录成功');
    router.push('/home');
  } catch {
    // 错误已在拦截器处理
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
}

.login-visual {
  flex: 1.1;
  position: relative;
  display: none;
  overflow: hidden;
}

.visual-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.visual-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(160deg, rgba(12, 12, 16, 0.75) 0%, rgba(12, 12, 16, 0.45) 50%, rgba(255, 36, 66, 0.25) 100%);
}

.visual-content {
  position: relative;
  z-index: 1;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 48px;
  color: #fff;
}

.visual-badge {
  display: inline-block;
  width: fit-content;
  padding: 6px 14px;
  margin-bottom: 20px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 999px;
  backdrop-filter: blur(8px);
}

.visual-content h2 {
  font-size: 36px;
  font-weight: 800;
  line-height: 1.25;
  letter-spacing: -0.03em;
}

.visual-content > p {
  margin-top: 14px;
  font-size: 15px;
  color: rgba(255, 255, 255, 0.75);
}

.feature-list {
  margin-top: 32px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.88);
}

.feature-item .el-icon {
  color: #ff6b81;
  font-size: 18px;
}

.login-form-panel {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 24px;
  background: var(--xhs-bg);
}

.login-card {
  width: 100%;
  max-width: 400px;
  padding: 40px 36px;
  background: #fff;
  border-radius: 24px;
  border: 1px solid var(--xhs-border);
  box-shadow: var(--xhs-shadow-lg);
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
}

.logo-mark {
  width: 52px;
  height: 52px;
  margin: 0 auto 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #ff2442, #ff6b81);
  border-radius: 16px;
  color: #fff;
  font-size: 22px;
  font-weight: 800;
  box-shadow: 0 12px 28px rgba(255, 36, 66, 0.3);
}

.login-header h1 {
  font-size: 24px;
  font-weight: 800;
  color: var(--xhs-text);
  letter-spacing: -0.02em;
}

.login-header p {
  margin-top: 6px;
  color: var(--xhs-text-secondary);
  font-size: 14px;
}

.login-btn {
  width: 100%;
  height: 48px;
  font-size: 15px;
  border-radius: 12px !important;
}

.login-tip {
  text-align: center;
  margin-top: 20px;
  color: var(--xhs-text-secondary);
  font-size: 13px;
}

.login-tip code {
  background: var(--xhs-primary-soft);
  color: var(--xhs-primary);
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
}

@media (min-width: 900px) {
  .login-visual {
    display: block;
  }
}
</style>
