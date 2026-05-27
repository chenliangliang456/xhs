<template>
  <div class="page-container">
    <PageHero
      title="小红书账号管理"
      subtitle="管理多个发布账号，支持浏览器登录、扫码登录与 Cookie 认证"
      :image="PLACEHOLDERS.accounts"
      badge="Accounts"
    />

    <el-collapse class="cookie-help card-section" style="padding: 0 20px">
      <el-collapse-item title="Mac 如何复制 Cookie？（扫码失败时用，推荐）" name="help">
        <div class="help-content">
          <p class="help-tip">Mac 没有 F12，请用下面任一方法，<strong>都不需要找「控制台」</strong>。</p>

          <p><strong>方法一：Network 复制（最简单，推荐）</strong></p>
          <ol>
            <li>Chrome 打开 <a href="https://creator.xiaohongshu.com" target="_blank" rel="noopener">creator.xiaohongshu.com</a> 并登录</li>
            <li>在页面空白处 <strong>右键 → 检查</strong>（或按 <kbd>⌘</kbd>+<kbd>⌥</kbd>+<kbd>I</kbd>）</li>
            <li>开发者工具顶部点 <strong>Network</strong>（网络；图标像几条横线）</li>
            <li>按 <kbd>⌘</kbd>+<kbd>R</kbd> 刷新页面</li>
            <li>左侧点第一条 <code>creator.xiaohongshu.com</code> 或 <code>login</code> 请求</li>
            <li>右侧找 <strong>Headers</strong>（标头）→ 往下滚到 <strong>Request Headers</strong></li>
            <li>找到 <code>cookie:</code> 这一行，点右侧复制图标，或选中整段值复制</li>
            <li>「手动添加 Cookie」→ 粘贴 → 保存</li>
          </ol>

          <p><strong>方法二：Application → Cookies</strong></p>
          <ol>
            <li>登录创作者平台后，<strong>右键 → 检查</strong></li>
            <li>顶部点 <strong>Application</strong>（应用；可能在 » 里，先点双箭头展开）</li>
            <li>左侧展开 <strong>Storage → Cookies</strong> → 点 <code>https://creator.xiaohongshu.com</code></li>
            <li>右侧表格里找 <code>web_session</code>，双击 Value 复制；或逐条拼成 <code>名=值; 名=值</code></li>
          </ol>

          <p><strong>找不到英文菜单？</strong></p>
          <ul>
            <li>Chrome 菜单 <strong>View → Developer → Developer Tools</strong>（显示 → 开发者 → 开发者工具）</li>
            <li>标签可能在顶部被挤到 <strong>»</strong> 里，点 » 再找 Network / Application</li>
            <li>开发者工具可能在页面<strong>底部</strong>或<strong>右侧</strong>，向上看一排标签</li>
          </ul>

          <p class="help-tip">更简单：直接点上方 <strong>「浏览器登录」</strong>，会自动弹出 Chrome，登录后自动保存 Cookie，无需手动复制。</p>
        </div>
      </el-collapse-item>
    </el-collapse>

    <div class="card-section">
      <div class="toolbar">
        <el-button type="primary" @click="openBrowserLogin()">
          <el-icon><Monitor /></el-icon> 浏览器登录（推荐）
        </el-button>
        <el-button type="success" @click="qrDialogVisible = true">
          <el-icon><Iphone /></el-icon> 扫码登录
        </el-button>
        <el-button @click="openDialog()">
          <el-icon><Plus /></el-icon> 手动粘贴 Cookie
        </el-button>
      </div>

      <el-table :data="accounts" v-loading="loading" stripe class="account-table">
        <el-table-column label="账号名称" prop="name" width="160" />
        <el-table-column label="认证方式" width="120">
          <template #default="{ row }">
            <el-tag
              :type="row.loginType === 'browser' || row.loginType === 'qrcode' ? 'success' : row.authType === 'cookie' ? 'warning' : 'primary'"
              size="small"
            >
              {{ authTypeLabel(row) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="备注" prop="remark" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-switch
              :model-value="row.enabled"
              @change="toggleAccount(row)"
              active-text="启用"
              inactive-text="禁用"
            />
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="240" fixed="right">
          <template #default="{ row }">
            <el-button link type="success" @click="refreshLogin(row)">刷新登录</el-button>
            <el-button link type="primary" @click="openDialog(row)">编辑</el-button>
            <el-button link type="danger" @click="deleteAccount(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog
      v-model="dialogVisible"
      :title="editingId ? '编辑账号' : '新增账号'"
      width="520px"
      destroy-on-close
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="账号名称" prop="name">
          <el-input v-model="form.name" placeholder="例：主号、副号1" />
        </el-form-item>
        <el-form-item label="认证方式" prop="authType">
          <el-radio-group v-model="form.authType">
            <el-radio value="cookie">Cookie 认证</el-radio>
            <el-radio value="password">账号密码</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="form.authType === 'cookie'" label="Cookie" prop="cookie">
          <el-input
            v-model="form.cookie"
            type="textarea"
            :rows="5"
            placeholder="Mac：Chrome 按 ⌘⌥I → Application → Cookies → 复制；或在控制台执行 document.cookie"
          />
        </el-form-item>
        <template v-if="form.authType === 'password'">
          <el-form-item label="用户名" prop="username">
            <el-input v-model="form.username" placeholder="小红书账号" />
          </el-form-item>
          <el-form-item label="密码" prop="password">
            <el-input v-model="form.password" type="password" placeholder="密码" show-password />
          </el-form-item>
        </template>
        <el-form-item label="备注">
          <el-input v-model="form.remark" placeholder="可选备注" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveAccount">保存</el-button>
      </template>
    </el-dialog>

    <BrowserLoginDialog
      v-model="browserDialogVisible"
      :refresh-account-id="refreshAccountId"
      :refresh-account-name="refreshAccountName"
      @success="onBrowserLoginSuccess"
    />
    <QrLoginDialog v-model="qrDialogVisible" @success="loadAccounts" />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { Plus, Iphone, Monitor } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { accountApi } from '@/api';
import QrLoginDialog from '@/components/QrLoginDialog.vue';
import BrowserLoginDialog from '@/components/BrowserLoginDialog.vue';
import PageHero from '@/components/PageHero.vue';
import { PLACEHOLDERS } from '@/constants/placeholders';

const accounts = ref([]);
const loading = ref(false);
const dialogVisible = ref(false);
const qrDialogVisible = ref(false);
const browserDialogVisible = ref(false);
const refreshAccountId = ref('');
const refreshAccountName = ref('');
const saving = ref(false);
const editingId = ref(null);
const formRef = ref(null);

const form = reactive({
  name: '',
  authType: 'cookie',
  cookie: '',
  username: '',
  password: '',
  remark: '',
});

const rules = {
  name: [{ required: true, message: '请输入账号名称', trigger: 'blur' }],
};

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleString('zh-CN');
}

function authTypeLabel(row) {
  if (row.loginType === 'browser') return '浏览器登录';
  if (row.loginType === 'qrcode') return '扫码登录';
  if (row.authType === 'cookie') return 'Cookie';
  return '密码';
}

function openBrowserLogin() {
  refreshAccountId.value = '';
  refreshAccountName.value = '';
  browserDialogVisible.value = true;
}

function refreshLogin(row) {
  refreshAccountId.value = row.id;
  refreshAccountName.value = row.name;
  browserDialogVisible.value = true;
}

function onBrowserLoginSuccess() {
  refreshAccountId.value = '';
  refreshAccountName.value = '';
  loadAccounts();
}

async function loadAccounts() {
  loading.value = true;
  try {
    const res = await accountApi.list();
    accounts.value = res.data;
  } catch {
    // 错误已处理
  } finally {
    loading.value = false;
  }
}

function openDialog(row) {
  editingId.value = row?.id || null;
  Object.assign(form, {
    name: row?.name || '',
    authType: row?.authType || 'cookie',
    cookie: '',
    username: row?.username || '',
    password: '',
    remark: row?.remark || '',
  });
  dialogVisible.value = true;
}

async function saveAccount() {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;

  saving.value = true;
  try {
    if (editingId.value) {
      await accountApi.update(editingId.value, form);
      ElMessage.success('账号更新成功');
    } else {
      await accountApi.create(form);
      ElMessage.success('账号添加成功');
    }
    dialogVisible.value = false;
    loadAccounts();
  } catch {
    // 错误已处理
  } finally {
    saving.value = false;
  }
}

async function toggleAccount(row) {
  try {
    await accountApi.toggle(row.id);
    ElMessage.success(row.enabled ? '账号已禁用' : '账号已启用');
    loadAccounts();
  } catch {
    // 错误已处理
  }
}

async function deleteAccount(row) {
  await ElMessageBox.confirm(`确定删除账号「${row.name}」？`, '确认删除', {
    type: 'warning',
  });

  try {
    await accountApi.remove(row.id);
    ElMessage.success('删除成功');
    loadAccounts();
  } catch {
    // 错误已处理
  }
}

onMounted(loadAccounts);
</script>

<style scoped>
.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 20px;
}

.account-table {
  margin-top: 4px;
  border-radius: var(--xhs-radius-sm);
}

.cookie-help {
  margin-bottom: 20px;
  border: 1px solid var(--xhs-border) !important;
  border-radius: var(--xhs-radius) !important;
  overflow: hidden;
  background: #fff;
}

.help-content {
  font-size: 14px;
  line-height: 1.8;
  color: #606266;
  padding: 0 8px 8px;
}

.help-content ol {
  margin: 8px 0;
  padding-left: 20px;
}

.help-content kbd {
  display: inline-block;
  padding: 2px 6px;
  font-size: 12px;
  background: #f5f7fa;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
}

.help-content code {
  font-size: 12px;
  background: #f5f7fa;
  padding: 2px 6px;
  border-radius: 4px;
}

.copy-code {
  display: inline-block;
  user-select: all;
}

.help-tip {
  margin-top: 12px;
  color: #e6a23c;
}
</style>
