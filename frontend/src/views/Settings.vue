<template>
  <div class="page-container">
    <PageHero
      title="系统设置"
      subtitle="在下方填写 API 密钥即可生效；也可在 backend/.env 中配置（.env 为默认值，此处保存会覆盖）"
      :image="PLACEHOLDERS.settings"
      badge="Settings"
    />

    <el-alert
      title="API 密钥保存后立即生效，无需重启"
      type="success"
      :closable="false"
      show-icon
      style="margin-bottom: 20px"
    >
      <template #default>
        密钥仅保存在服务端数据库，页面展示为脱敏格式。留空密钥字段表示不修改已保存的密钥。
      </template>
    </el-alert>

    <el-tabs v-model="activeTab">
      <el-tab-pane label="DeepSeek AI" name="ai">
        <div class="card-section">
          <el-tag
            :type="settings?.aiApi?.configured ? 'success' : 'warning'"
            size="small"
            style="margin-bottom: 16px"
          >
            {{ settings?.aiApi?.configured ? '已配置' : '未配置' }}
            <template v-if="settings?.aiApi?.savedInApp"> · 已保存到应用</template>
          </el-tag>
          <el-form :model="forms.aiApi" label-width="120px" style="max-width: 560px">
            <el-form-item label="接口地址">
              <el-input
                v-model="forms.aiApi.url"
                placeholder="https://api.deepseek.com（填根地址即可）"
              />
            </el-form-item>
            <el-form-item label="API Key">
              <el-input
                v-model="forms.aiApi.apiKey"
                type="password"
                show-password
                :placeholder="settings?.aiApi?.apiKeyConfigured ? '已配置，留空不修改' : 'sk-...'"
              />
              <p v-if="settings?.aiApi?.apiKey" class="field-hint">当前：{{ settings.aiApi.apiKey }}</p>
            </el-form-item>
            <el-form-item label="模型">
              <el-input v-model="forms.aiApi.model" placeholder="deepseek-chat" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :loading="saving.ai" @click="saveSection('aiApi')">
                保存 DeepSeek 配置
              </el-button>
            </el-form-item>
          </el-form>
        </div>
      </el-tab-pane>

      <el-tab-pane label="AI 批量生图" name="imageGen">
        <div class="card-section">
          <el-tag
            :type="settings?.imageGen?.configured ? 'success' : 'warning'"
            size="small"
            style="margin-bottom: 16px"
          >
            {{ settings?.imageGen?.configured ? '已配置' : '未配置' }}
            <template v-if="settings?.imageGen?.savedInApp"> · 已保存到应用</template>
          </el-tag>
          <el-form :model="forms.imageGen" label-width="120px" style="max-width: 560px">
            <el-form-item label="接口地址">
              <el-input
                v-model="forms.imageGen.apiBaseUrl"
                placeholder="https://api.apimart.ai（填根地址即可）"
              />
            </el-form-item>
            <el-form-item label="API Key">
              <el-input
                v-model="forms.imageGen.apiKey"
                type="password"
                show-password
                :placeholder="settings?.imageGen?.apiKeyConfigured ? '已配置，留空不修改' : '填入生图 API 密钥'"
              />
              <p v-if="settings?.imageGen?.apiKey" class="field-hint">当前：{{ settings.imageGen.apiKey }}</p>
            </el-form-item>
            <el-form-item label="模型">
              <el-input value="gpt-image-2（固定）" disabled />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :loading="saving.imageGen" @click="saveSection('imageGen')">
                保存批量生图配置
              </el-button>
            </el-form-item>
          </el-form>
        </div>
      </el-tab-pane>

      <el-tab-pane label="GPT 开放生图" name="gptOpen">
        <div class="card-section">
          <el-alert
            title="无额度限制 · 主生图额度用尽时的备用通道"
            type="info"
            :closable="false"
            show-icon
            style="margin-bottom: 16px"
          />
          <el-form :model="forms.gptOpen" label-width="130px" style="max-width: 560px">
            <el-form-item label="生图状态">
              <el-tag :type="settings?.gptOpen?.imageConfigured ? 'success' : 'warning'" size="small">
                {{ settings?.gptOpen?.imageConfigured ? '生图已配置' : '生图未配置' }}
              </el-tag>
            </el-form-item>
            <el-form-item label="生图接口">
              <el-input
                v-model="forms.gptOpen.imageApiBaseUrl"
                placeholder="留空则复用批量生图接口"
              />
            </el-form-item>
            <el-form-item label="生图 API Key">
              <el-input
                v-model="forms.gptOpen.imageApiKey"
                type="password"
                show-password
                :placeholder="settings?.gptOpen?.imageApiKeyConfigured ? '已配置，留空不修改' : '留空则复用批量生图密钥'"
              />
              <p v-if="settings?.gptOpen?.imageApiKey" class="field-hint">当前：{{ settings.gptOpen.imageApiKey }}</p>
            </el-form-item>
            <el-form-item label="生图模型">
              <el-input v-model="forms.gptOpen.imageModel" placeholder="gpt-image-2" />
            </el-form-item>

            <el-divider content-position="left">思考模式（DeepSeek）</el-divider>

            <el-form-item label="思考模式">
              <el-tag :type="settings?.gptOpen?.thinkConfigured ? 'success' : 'info'" size="small">
                {{ settings?.gptOpen?.thinkConfigured ? '思考 API 已配置' : '思考 API 未配置' }}
              </el-tag>
              <p class="field-hint">思考与生图分离：生图走 apimart，思考走 DeepSeek</p>
            </el-form-item>
            <el-form-item label="思考接口">
              <el-input
                v-model="forms.gptOpen.chatUrl"
                placeholder="https://api.deepseek.com（留空则复用 DeepSeek 文案 API）"
              />
            </el-form-item>
            <el-form-item label="思考 API Key">
              <el-input
                v-model="forms.gptOpen.chatApiKey"
                type="password"
                show-password
                :placeholder="settings?.gptOpen?.chatApiKeyConfigured ? '已配置，留空不修改' : '留空则复用 DeepSeek 密钥'"
              />
              <p v-if="settings?.gptOpen?.chatApiKey" class="field-hint">当前：{{ settings.gptOpen.chatApiKey }}</p>
            </el-form-item>
            <el-form-item label="思考模型">
              <el-input v-model="forms.gptOpen.chatModel" placeholder="deepseek-chat" />
              <p class="field-hint">在 DeepSeek 控制台获取 API Key，填入上方或「DeepSeek AI」标签页</p>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :loading="saving.gptOpen" @click="saveSection('gptOpen')">
                保存 GPT 开放生图配置
              </el-button>
            </el-form-item>
          </el-form>
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
const saving = reactive({ ai: false, imageGen: false, gptOpen: false });

const forms = reactive({
  aiApi: { url: '', apiKey: '', model: '' },
  imageGen: { apiBaseUrl: '', apiKey: '' },
  gptOpen: {
    imageApiBaseUrl: '',
    imageApiKey: '',
    imageModel: '',
    chatUrl: '',
    chatApiKey: '',
    chatModel: '',
  },
});

const pwdForm = reactive({
  oldPassword: '',
  newPassword: '',
});

function fillFormsFromSettings(data) {
  if (!data) return;
  forms.aiApi.url = data.aiApi?.url || '';
  forms.aiApi.model = data.aiApi?.model || '';
  forms.aiApi.apiKey = '';
  forms.imageGen.apiBaseUrl = data.imageGen?.apiBaseUrl || '';
  forms.imageGen.apiKey = '';
  forms.gptOpen.imageApiBaseUrl = data.gptOpen?.imageApiBaseUrl || '';
  forms.gptOpen.imageModel = data.gptOpen?.imageModel || '';
  forms.gptOpen.imageApiKey = '';
  forms.gptOpen.chatUrl = data.gptOpen?.chatUrl || '';
  forms.gptOpen.chatModel = data.gptOpen?.chatModel || '';
  forms.gptOpen.chatApiKey = '';
}

async function loadSettings() {
  try {
    const res = await settingsApi.get();
    settings.value = res.data;
    fillFormsFromSettings(res.data);
  } catch {
    // 错误已处理
  }
}

async function saveSection(section) {
  const payload = { [section]: { ...forms[section] } };
  const key = section === 'aiApi' ? 'ai' : section === 'imageGen' ? 'imageGen' : 'gptOpen';
  saving[key] = true;
  try {
    const res = await settingsApi.saveApiKeys(payload);
    settings.value = res.data;
    fillFormsFromSettings(res.data);
    ElMessage.success(res.message || '保存成功');
  } catch {
    // 错误已处理
  } finally {
    saving[key] = false;
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
  if (tab && ['ai', 'imageGen', 'gptOpen', 'security'].includes(tab)) {
    activeTab.value = tab;
  }
  loadSettings();
});
</script>

<style scoped>
.field-hint {
  margin: 6px 0 0;
  font-size: 12px;
  color: var(--xhs-text-secondary);
}
</style>
