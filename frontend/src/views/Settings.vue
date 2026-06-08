<template>
  <div class="page-container">
    <PageHero
      title="系统设置"
      subtitle="API 接口配置在 backend/.env 中维护，修改后需重启后端"
      :image="PLACEHOLDERS.settings"
      badge="Settings"
    />

    <el-alert
      title="配置来源：backend/.env 环境变量文件"
      type="info"
      :closable="false"
      show-icon
      style="margin-bottom: 20px"
    >
      <template #default>
        复制 <code>backend/.env.example</code> 为 <code>backend/.env</code>，填写 API 地址和密钥后重启服务生效。
      </template>
    </el-alert>

    <el-tabs v-model="activeTab">
      <el-tab-pane label="DeepSeek AI" name="ai">
        <div class="card-section">
          <el-descriptions :column="1" border>
            <el-descriptions-item label="状态">
              <el-tag :type="settings?.aiApi?.configured ? 'success' : 'warning'" size="small">
                {{ settings?.aiApi?.configured ? 'DeepSeek 已配置' : '未配置（模拟模式）' }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="接口地址">
              {{ settings?.aiApi?.url || 'https://api.deepseek.com/v1/chat/completions' }}
            </el-descriptions-item>
            <el-descriptions-item label="API Key">
              {{ settings?.aiApi?.apiKey || '（空）' }}
            </el-descriptions-item>
            <el-descriptions-item label="模型">
              {{ settings?.aiApi?.model || 'deepseek-chat' }}
            </el-descriptions-item>
          </el-descriptions>
          <div class="env-hint">
            在 <code>backend/.env</code> 中配置 DeepSeek 密钥，修改后重启后端
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane label="AI 批量生图" name="imageGen">
        <div class="card-section">
          <el-descriptions :column="1" border>
            <el-descriptions-item label="状态">
              <el-tag :type="settings?.imageGen?.configured ? 'success' : 'warning'" size="small">
                {{ settings?.imageGen?.configured ? '文生图 API 已配置' : '未配置' }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="接口地址">
              {{ settings?.imageGen?.apiBaseUrl || '（空）' }}
            </el-descriptions-item>
            <el-descriptions-item label="API Key">
              {{ settings?.imageGen?.apiKey || '（空）' }}
            </el-descriptions-item>
            <el-descriptions-item label="模型">
              gpt-image-2（固定）
            </el-descriptions-item>
          </el-descriptions>
          <div class="env-hint">
            对应变量：<code>IMAGE_GEN_API_BASE_URL</code>、<code>IMAGE_GEN_API_KEY</code>（或 <code>API_BASE_URL</code> / <code>API_KEY</code>）
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane label="账号安全" name="security">
        <div class="card-section">
          <el-form :model="pwdForm" label-width="100px" style="max-width: 400px">
            <el-form-item label="原密码">
              <el-input v-model="pwdForm.oldPassword" type="password" show-password />
            </el-form-item>
            <el-form-item label="新密码">
              <el-input v-model="pwdForm.newPassword" type="password" show-password />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :loading="changingPwd" @click="changePassword">修改密码</el-button>
            </el-form-item>
          </el-form>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { ElMessage } from 'element-plus';
import { settingsApi, authApi } from '@/api';
import PageHero from '@/components/PageHero.vue';
import { PLACEHOLDERS } from '@/constants/placeholders';

const route = useRoute();
const activeTab = ref('ai');
const settings = ref(null);
const changingPwd = ref(false);

const pwdForm = reactive({
  oldPassword: '',
  newPassword: '',
});

async function loadSettings() {
  try {
    const res = await settingsApi.get();
    settings.value = res.data;
  } catch {
    // 错误已处理
  }
}

async function changePassword() {
  if (!pwdForm.oldPassword || !pwdForm.newPassword) {
    ElMessage.warning('请填写完整');
    return;
  }

  changingPwd.value = true;
  try {
    await authApi.changePassword(pwdForm);
    ElMessage.success('密码修改成功');
    pwdForm.oldPassword = '';
    pwdForm.newPassword = '';
  } catch {
    // 错误已处理
  } finally {
    changingPwd.value = false;
  }
}

onMounted(() => {
  const tab = route.query.tab;
  if (tab && ['ai', 'imageGen', 'security'].includes(tab)) {
    activeTab.value = tab;
  }
  loadSettings();
});
</script>

<style scoped>
.env-hint {
  margin-top: 16px;
  padding: 12px;
  background: #f5f7fa;
  border-radius: 6px;
  font-size: 13px;
  color: #606266;
}

.env-hint code {
  background: #ebeef5;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
}

code {
  background: #f5f7fa;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 13px;
}
</style>
