<template>
  <div class="page-container materials-page">
    <PageHero
      title="我的素材库"
      subtitle="A / B / C 成套管理 · 支持单张删除、批量删除、整套删除"
      :image="PLACEHOLDERS.materials"
      badge="Assets"
    >
      <template #actions>
        <el-tag type="info" effect="plain" size="large">
          悬停图片右上角可删除 · 文件夹视图支持批量勾选
        </el-tag>
        <el-button type="primary" plain :loading="zipLoading" @click="downloadMaterialsZip()">
          <el-icon><Download /></el-icon>
          打包下载 ZIP（按套装 a1/b1/c1）
        </el-button>
      </template>
    </PageHero>

    <el-alert type="info" :closable="true" show-icon class="materials-flow-hint">
      <template #title>素材库在流程中的位置</template>
      在「批量生图」生成并保存 a/b/c 后，可在此管理套装；点击 A 图可跳转继续生成 B+C；完整流程见
      <router-link to="/home">主界面工作流</router-link>。
    </el-alert>

    <!-- 统计栏 -->
    <div class="stats-bar">
      <div v-for="f in folderList" :key="f.id" class="stat-chip" @click="selectFolder(f.id)">
        <span class="chip-label">文件夹 {{ f.label }}</span>
        <span class="chip-count">{{ f.count }}</span>
      </div>
      <div class="stat-chip sets" @click="selectFolder(null)">
        <span class="chip-label">成套素材</span>
        <span class="chip-count">{{ groups.length }}</span>
      </div>
    </div>

    <!-- 上传区 -->
    <div class="upload-banner card-section">
      <div class="upload-banner-bg">
        <img :src="PLACEHOLDERS.emptyUpload" alt="" />
      </div>
      <div class="upload-banner-body">
        <h3><el-icon><FolderAdd /></el-icon> 上传素材文件夹</h3>
        <p>自动识别 a / b / c 子目录，或按 a1.jpg 命名规则导入</p>
        <input
          ref="folderInputRef"
          type="file"
          webkitdirectory
          directory
          multiple
          accept="image/*"
          class="hidden-input"
          @change="handleFolderUpload"
        />
        <el-button type="primary" size="large" :loading="uploadingFolder" @click="triggerFolderUpload">
          选择文件夹上传
        </el-button>
        <el-progress
          v-if="uploadingFolder && uploadProgress.total"
          :percentage="uploadProgress.percent"
          :format="() => `${uploadProgress.done}/${uploadProgress.total}`"
          style="margin-top: 12px; max-width: 360px"
        />
      </div>
    </div>

    <!-- 主布局 -->
    <div class="library-layout card-section">
      <aside class="folder-sidebar">
        <div class="sidebar-title">目录</div>
        <div
          class="folder-item"
          :class="{ active: currentFolder === null }"
          @click="selectFolder(null)"
        >
          <el-icon><Files /></el-icon>
          <span>全部套装</span>
          <el-tag size="small" round>{{ groups.length }}</el-tag>
        </div>
        <div
          v-for="f in folderList"
          :key="f.id"
          class="folder-item"
          :class="{ active: currentFolder === f.id }"
          @click="selectFolder(f.id)"
        >
          <span class="folder-badge" :class="f.id">{{ f.label }}</span>
          <span class="flex-1">文件夹 {{ f.label }}</span>
          <el-tag size="small" round type="info">{{ f.count }}</el-tag>
        </div>
      </aside>

      <main class="folder-content">
        <!-- ===== 全部套装 ===== -->
        <template v-if="currentFolder === null">
          <div class="content-toolbar">
            <div>
              <h3>成套素材</h3>
              <p class="sub">发布时选 A 图，自动搭配同编号 B、C</p>
            </div>
            <div class="toolbar-actions">
              <el-button type="primary" plain :loading="zipLoading" @click="downloadMaterialsZip()">
                <el-icon><Download /></el-icon>
                打包 ZIP（set_001 内含 a1、b1、c1，已排序）
              </el-button>
            </div>
          </div>

          <div v-if="groups.length" class="sets-grid">
            <div
              v-for="group in groups"
              :key="group.index"
              class="set-card"
              :class="{ complete: group.complete }"
            >
              <div class="set-header">
                <div>
                  <span class="set-name">套装 #{{ group.index }}</span>
                  <el-tag :type="group.complete ? 'success' : 'warning'" size="small">
                    {{ group.complete ? '完整' : '缺图' }}
                  </el-tag>
                </div>
                <div class="set-actions">
                  <el-button
                    v-if="group.a && !group.complete"
                    type="primary"
                    size="small"
                    @click="goGenerateBc(group.a)"
                  >
                    <el-icon><MagicStick /></el-icon> 生成 B+C
                  </el-button>
                  <el-button
                    type="danger"
                    size="small"
                    plain
                    @click="removeSet(group.index)"
                  >
                    <el-icon><Delete /></el-icon> 删除整套
                  </el-button>
                </div>
              </div>
              <div class="set-images">
                <div v-for="slot in ['a', 'b', 'c']" :key="slot" class="set-slot">
                  <span class="slot-folder">{{ slot.toUpperCase() }}</span>
                  <div v-if="group[slot]" class="slot-img-wrap">
                    <img :src="assetUrl(group[slot].url)" :alt="group[slot].filename" />
                    <button
                      class="del-btn"
                      title="删除"
                      @click="removeItem(group[slot])"
                    >
                      <el-icon><Delete /></el-icon>
                    </button>
                  </div>
                  <div v-else class="slot-missing">{{ slot }}{{ group.index }}</div>
                  <span v-if="group[slot]" class="fname">{{ group[slot].filename }}</span>
                </div>
              </div>
            </div>
          </div>
          <el-empty v-else description="暂无素材，请先上传">
            <template #image>
              <div class="empty-visual"><img :src="PLACEHOLDERS.emptyMaterials" alt="" /></div>
            </template>
            <el-button type="primary" @click="triggerFolderUpload">上传文件夹</el-button>
          </el-empty>
        </template>

        <!-- ===== 单文件夹 ===== -->
        <template v-else>
          <div class="content-toolbar">
            <div>
              <h3>
                <span class="folder-badge lg" :class="currentFolder">{{ currentFolder.toUpperCase() }}</span>
                文件夹 {{ currentFolder.toUpperCase() }}
              </h3>
              <p class="sub">共 {{ currentFiles.length }} 张图片</p>
            </div>
            <div class="toolbar-actions">
              <el-button
                v-if="currentFolder === 'a'"
                type="primary"
                @click="goGenerateBc()"
              >
                <el-icon><MagicStick /></el-icon>
                去生成 B + C
              </el-button>
              <el-button
                v-if="selectedFiles.length"
                type="danger"
                @click="batchDelete"
              >
                <el-icon><Delete /></el-icon>
                删除选中（{{ selectedFiles.length }}）
              </el-button>
              <el-button @click="toggleSelectAll">
                {{ allSelected ? '取消全选' : '全选' }}
              </el-button>
              <el-button type="primary" plain :loading="zipLoading" @click="downloadMaterialsZip(currentFolder)">
                <el-icon><Download /></el-icon>
                本文件夹 ZIP（{{ currentFolder.toUpperCase() }} 按编号排序）
              </el-button>
            </div>
          </div>

          <el-alert
            v-if="currentFolder === 'a'"
            type="info"
            :closable="false"
            show-icon
            class="folder-a-hint"
          >
            点击任意 A 图上的「生成 B+C」，将跳转到批量生图页，基于该图自动生成五宫格 B 与产品信息图 C。
          </el-alert>

          <div class="upload-bar">
            <input
              ref="subFolderInputRef"
              type="file"
              webkitdirectory
              directory
              multiple
              accept="image/*"
              class="hidden-input"
              @change="handleSubFolderUpload"
            />
            <el-button :loading="uploadingFolder" @click="triggerSubFolderUpload">
              <el-icon><FolderAdd /></el-icon> 上传文件夹
            </el-button>
            <el-input-number
              v-model="uploadIndex[currentFolder]"
              :min="1"
              :max="999"
              size="small"
              controls-position="right"
            />
            <span class="hint">→ {{ currentFolder }}{{ uploadIndex[currentFolder] }}.jpg</span>
            <el-upload
              :auto-upload="false"
              :show-file-list="false"
              accept="image/*"
              multiple
              @change="handleUpload"
            >
              <el-button type="primary" :loading="uploading">
                <el-icon><Upload /></el-icon> 上传图片
              </el-button>
            </el-upload>
          </div>

          <div v-if="currentFiles.length" class="file-grid">
            <div
              v-for="item in currentFiles"
              :key="item.path"
              class="file-card"
              :class="{ selected: isSelected(item) }"
            >
              <div class="file-select" @click.stop="toggleSelect(item)">
                <el-checkbox :model-value="isSelected(item)" />
              </div>
              <div class="file-thumb">
                <img :src="assetUrl(item.url)" :alt="item.filename" />
                <div class="file-overlay">
                  <el-button
                    v-if="currentFolder === 'a'"
                    type="primary"
                    size="small"
                    @click="goGenerateBc(item)"
                  >
                    <el-icon><MagicStick /></el-icon> 生成 B+C
                  </el-button>
                  <el-button circle size="small" @click="previewMatch(item)">
                    <el-icon><View /></el-icon>
                  </el-button>
                  <el-button circle size="small" type="danger" @click="removeItem(item)">
                    <el-icon><Delete /></el-icon>
                  </el-button>
                </div>
              </div>
              <div class="file-info">
                <span class="file-name" :title="item.filename">{{ item.filename }}</span>
              </div>
            </div>
          </div>
          <el-empty v-else :description="`文件夹 ${currentFolder.toUpperCase()} 为空`">
            <el-upload :auto-upload="false" :show-file-list="false" accept="image/*" @change="handleUpload">
              <el-button type="primary">立即上传</el-button>
            </el-upload>
          </el-empty>
        </template>
      </main>
    </div>

    <el-dialog v-model="uploadResultVisible" title="导入结果" width="480px" destroy-on-close>
      <p v-if="uploadResult">
        成功 <strong>{{ uploadResult.success?.length || 0 }}</strong> 张，
        跳过 <strong>{{ uploadResult.skipped?.length || 0 }}</strong> 张
      </p>
      <el-scrollbar v-if="uploadResult?.skipped?.length" max-height="200" style="margin-top: 12px">
        <div v-for="(item, i) in uploadResult.skipped" :key="i" class="skip-item">
          {{ item.file }} — {{ item.reason }}
        </div>
      </el-scrollbar>
    </el-dialog>

    <el-dialog v-model="matchVisible" title="同编号搭配" width="560px" destroy-on-close>
      <template v-if="matchData">
        <p class="match-desc">
          <strong>{{ matchData.label }}</strong>
          <el-tag v-if="matchData.complete" type="success" size="small">完整</el-tag>
          <el-tag v-else type="warning" size="small">缺少 {{ matchData.missing?.join('、') }}</el-tag>
        </p>
        <div class="match-row">
          <div v-for="slot in ['a', 'b', 'c']" :key="slot" class="match-slot">
            <div class="match-label">{{ slot.toUpperCase() }}</div>
            <div v-if="matchData[slot]" class="slot-img-wrap">
              <img :src="assetUrl(matchData[slot].url)" />
              <button class="del-btn sm" @click="removeItem(matchData[slot]); matchVisible = false">
                <el-icon><Delete /></el-icon>
              </button>
            </div>
            <div v-else class="match-empty">无 {{ slot }}{{ matchData.index }}</div>
          </div>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import {
  FolderOpened,
  Files,
  Upload,
  FolderAdd,
  Delete,
  View,
  MagicStick,
  Download,
} from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { materialApi } from '@/api';
import PageHero from '@/components/PageHero.vue';
import { PLACEHOLDERS } from '@/constants/placeholders';
import { assetUrl } from '@/utils/assetUrl';

const router = useRouter();
const currentFolder = ref(null);
const uploading = ref(false);
const uploadingFolder = ref(false);
const folderInputRef = ref(null);
const subFolderInputRef = ref(null);
const uploadProgress = reactive({ done: 0, total: 0, percent: 0 });
const uploadResultVisible = ref(false);
const uploadResult = ref(null);
const folders = reactive({ a: [], b: [], c: [] });
const groups = ref([]);
const uploadIndex = reactive({ a: 1, b: 1, c: 1 });
const matchVisible = ref(false);
const matchData = ref(null);
const selectedFiles = ref([]);
const zipLoading = ref(false);

const folderList = computed(() =>
  ['a', 'b', 'c'].map((id) => ({
    id,
    label: id.toUpperCase(),
    count: folders[id]?.length || 0,
  }))
);

const currentFiles = computed(() => {
  if (!currentFolder.value) return [];
  return folders[currentFolder.value] || [];
});

const allSelected = computed(
  () =>
    currentFiles.value.length > 0 &&
    selectedFiles.value.length === currentFiles.value.length
);

function selectFolder(id) {
  currentFolder.value = id;
  selectedFiles.value = [];
}

function goGenerateBc(item) {
  if (item) {
    router.push({
      path: '/batch-image',
      query: {
        from: 'materials',
        path: item.path,
        url: item.url,
        index: item.index,
        filename: item.filename,
      },
    });
    return;
  }
  router.push({ path: '/batch-image', query: { from: 'materials' } });
}

function fileKey(item) {
  return `${item.folder}/${item.filename}`;
}

function isSelected(item) {
  return selectedFiles.value.some((f) => fileKey(f) === fileKey(item));
}

function toggleSelect(item) {
  const key = fileKey(item);
  const idx = selectedFiles.value.findIndex((f) => fileKey(f) === key);
  if (idx >= 0) {
    selectedFiles.value.splice(idx, 1);
  } else {
    selectedFiles.value.push(item);
  }
}

function toggleSelectAll() {
  if (allSelected.value) {
    selectedFiles.value = [];
  } else {
    selectedFiles.value = [...currentFiles.value];
  }
}

async function loadMaterials() {
  try {
    const res = await materialApi.list();
    Object.assign(folders, res.data.folders);
    groups.value = res.data.groups;
    for (const f of ['a', 'b', 'c']) {
      const nums = (folders[f] || []).map((i) => Number(i.index || 0));
      uploadIndex[f] = nums.length ? Math.max(...nums) + 1 : 1;
    }
    selectedFiles.value = selectedFiles.value.filter((s) =>
      (folders[s.folder] || []).some((f) => f.filename === s.filename)
    );
  } catch (err) {
    if (err.response?.status === 404) {
      ElMessage.error('素材库接口未就绪，请重启后端');
    }
  }
}

/** 成套：ZIP 内为 set_001/a1.png …（README 说明对应套装编号）；单文件夹：a_sorted/… */
async function downloadMaterialsZip(folder) {
  const token = localStorage.getItem('token');
  zipLoading.value = true;
  try {
    const res = await fetch(materialApi.downloadZipUrl(folder), {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      credentials: 'same-origin',
    });
    const ct = res.headers.get('content-type') || '';
    if (!res.ok) {
      let msg = '下载失败';
      if (ct.includes('application/json')) {
        const j = await res.json().catch(() => ({}));
        msg = j.message || msg;
      } else {
        const t = await res.text().catch(() => '');
        if (t.includes('<!DOCTYPE') || t.includes('<html')) {
          msg = '接口返回了网页而非压缩包，请确认已登录并访问正确端口（开发环境请用 5173 或配置代理）';
        }
      }
      ElMessage.error(msg);
      return;
    }
    const blob = await res.blob();
    const head = await blob.slice(0, 4).arrayBuffer();
    const sig = new Uint8Array(head);
    const isZip = sig[0] === 0x50 && sig[1] === 0x4b;
    if (!isZip) {
      ElMessage.error('返回内容不是 ZIP 文件，请检查是否已登录或后端是否正常');
      return;
    }
    const cd = res.headers.get('content-disposition') || '';
    let fname = folder ? `materials_${folder}.zip` : 'materials_sets.zip';
    const utf8Star = cd.match(/filename\*=UTF-8''([^;]+)/i);
    const ascii = cd.match(/filename="([^"]+)"/i) || cd.match(/filename=([^;\s]+)/i);
    if (utf8Star) {
      try {
        fname = decodeURIComponent(utf8Star[1]);
      } catch {
        fname = utf8Star[1];
      }
    } else if (ascii) {
      fname = ascii[1];
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fname;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    ElMessage.success('ZIP 已开始下载');
  } catch (e) {
    ElMessage.error(e.message || '下载失败');
  } finally {
    zipLoading.value = false;
  }
}

function triggerFolderUpload() {
  folderInputRef.value?.click();
}

function triggerSubFolderUpload() {
  subFolderInputRef.value?.click();
}

async function handleFolderUpload(event) {
  const fileList = event.target.files;
  if (!fileList?.length) return;
  const imageFiles = [...fileList].filter((f) => f.type.startsWith('image/'));
  if (!imageFiles.length) {
    ElMessage.warning('文件夹中没有图片');
    return;
  }
  await doFolderUpload(imageFiles, null);
  event.target.value = '';
}

async function handleSubFolderUpload(event) {
  const fileList = event.target.files;
  if (!fileList?.length || !currentFolder.value) return;
  const imageFiles = [...fileList].filter((f) => f.type.startsWith('image/'));
  if (!imageFiles.length) {
    ElMessage.warning('文件夹中没有图片');
    return;
  }
  await doFolderUpload(imageFiles, currentFolder.value);
  event.target.value = '';
}

async function doFolderUpload(files, targetFolder) {
  uploadingFolder.value = true;
  uploadProgress.total = files.length;
  uploadProgress.done = 0;
  uploadProgress.percent = 0;
  try {
    const res = await materialApi.uploadFolder(files, targetFolder);
    uploadResult.value = res.data;
    uploadProgress.percent = 100;
    ElMessage.success(res.message);
    if (res.data.skipped?.length) uploadResultVisible.value = true;
    await loadMaterials();
  } finally {
    uploadingFolder.value = false;
    uploadProgress.total = 0;
  }
}

async function handleUpload(file) {
  if (!file?.raw || !currentFolder.value) return;
  uploading.value = true;
  try {
    const folder = currentFolder.value;
    const res = await materialApi.upload(file.raw, folder, uploadIndex[folder]);
    ElMessage.success(res.message);
    await loadMaterials();
    uploadIndex[folder] = Number(res.data.index) + 1;
  } finally {
    uploading.value = false;
  }
}

async function removeItem(item) {
  await ElMessageBox.confirm(`确定删除 ${item.filename}？`, '删除素材', {
    type: 'warning',
    confirmButtonText: '删除',
    cancelButtonText: '取消',
  });
  try {
    await materialApi.remove(item.folder, item.filename);
    ElMessage.success('已删除');
    await loadMaterials();
  } catch {
    // handled
  }
}

async function removeSet(index) {
  await ElMessageBox.confirm(
    `确定删除套装 #${index}（a${index} / b${index} / c${index}）？`,
    '删除整套',
    { type: 'warning', confirmButtonText: '删除整套', cancelButtonText: '取消' }
  );
  try {
    const res = await materialApi.removeSet(index);
    ElMessage.success(res.message || '整套已删除');
    await loadMaterials();
  } catch {
    // handled
  }
}

async function batchDelete() {
  if (!selectedFiles.value.length) return;
  await ElMessageBox.confirm(
    `确定删除选中的 ${selectedFiles.value.length} 张图片？`,
    '批量删除',
    { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' }
  );
  try {
    const res = await materialApi.batchRemove(
      selectedFiles.value.map((f) => ({ folder: f.folder, filename: f.filename }))
    );
    ElMessage.success(res.message || '批量删除完成');
    selectedFiles.value = [];
    await loadMaterials();
  } catch {
    // handled
  }
}

async function previewMatch(item) {
  try {
    const res = await materialApi.match(item.folder, item.filename);
    matchData.value = res.data;
    matchVisible.value = true;
  } catch {
    // handled
  }
}

onMounted(loadMaterials);
</script>

<style scoped>
.stats-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 16px;
}

.stat-chip {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 18px;
  background: var(--xhs-surface);
  border: 1px solid var(--xhs-border);
  border-radius: 999px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: var(--xhs-shadow);
}

.stat-chip:hover {
  border-color: var(--xhs-primary);
  transform: translateY(-1px);
}

.chip-label {
  font-size: 13px;
  color: var(--xhs-text-secondary);
}

.chip-count {
  font-size: 16px;
  font-weight: 800;
  color: var(--xhs-text);
}

.stat-chip.sets .chip-count {
  color: var(--xhs-primary);
}

.upload-banner {
  position: relative;
  padding: 0 !important;
  overflow: hidden;
  min-height: 140px;
  margin-bottom: 16px;
}

.upload-banner-bg {
  position: absolute;
  inset: 0;
  opacity: 0.15;
}

.upload-banner-bg img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.upload-banner-body {
  position: relative;
  padding: 28px 32px;
}

.upload-banner-body h3 {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 6px;
}

.upload-banner-body p {
  font-size: 14px;
  color: var(--xhs-text-secondary);
  margin-bottom: 16px;
}

.hidden-input {
  display: none;
}

.library-layout {
  display: flex;
  padding: 0 !important;
  overflow: hidden;
  min-height: 520px;
}

.folder-sidebar {
  width: 200px;
  flex-shrink: 0;
  border-right: 1px solid var(--xhs-border);
  padding: 16px 10px;
  background: linear-gradient(180deg, #fafbfc, #fff);
}

.sidebar-title {
  padding: 0 10px 12px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--xhs-text-secondary);
}

.folder-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  margin-bottom: 4px;
  border-radius: 10px;
  cursor: pointer;
  font-size: 14px;
  color: var(--xhs-text-secondary);
  transition: all 0.2s;
}

.folder-item:hover {
  background: var(--xhs-bg);
  color: var(--xhs-text);
}

.folder-item.active {
  background: var(--xhs-primary-soft);
  color: var(--xhs-primary);
  font-weight: 600;
}

.folder-badge {
  width: 24px;
  height: 24px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 800;
  color: #fff;
  flex-shrink: 0;
}

.folder-badge.a { background: #ff2442; }
.folder-badge.b { background: #f59e0b; }
.folder-badge.c { background: #10b981; }
.folder-badge.lg { width: 32px; height: 32px; font-size: 14px; margin-right: 8px; }

.flex-1 { flex: 1; }

.folder-content {
  flex: 1;
  padding: 20px 24px;
  overflow-y: auto;
}

.content-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
  gap: 16px;
  flex-wrap: wrap;
}

.content-toolbar h3 {
  display: flex;
  align-items: center;
  font-size: 18px;
  font-weight: 700;
}

.sub {
  font-size: 13px;
  color: var(--xhs-text-secondary);
  margin-top: 4px;
}

.toolbar-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.upload-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  padding: 14px 16px;
  background: var(--xhs-bg);
  border-radius: var(--xhs-radius-sm);
  margin-bottom: 20px;
}

.hint {
  font-size: 13px;
  color: var(--xhs-text-secondary);
}

/* 套装卡片 */
.sets-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.set-card {
  border: 1px solid var(--xhs-border);
  border-radius: var(--xhs-radius-sm);
  padding: 16px;
  background: #fff;
  transition: box-shadow 0.2s;
}

.set-card.complete {
  border-color: rgba(16, 185, 129, 0.35);
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.04), #fff);
}

.set-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  gap: 8px;
}

.set-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.folder-a-hint {
  margin-bottom: 16px;
}

.set-name {
  font-weight: 700;
  margin-right: 8px;
}

.set-images {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.set-slot {
  text-align: center;
}

.slot-folder {
  font-size: 11px;
  font-weight: 700;
  color: var(--xhs-text-secondary);
  display: block;
  margin-bottom: 6px;
}

.slot-img-wrap {
  position: relative;
  border-radius: 10px;
  overflow: hidden;
}

.slot-img-wrap img {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  display: block;
}

.del-btn {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 8px;
  background: rgba(239, 68, 68, 0.92);
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.88;
  transition: opacity 0.2s, transform 0.2s;
  box-shadow: 0 2px 8px rgba(239, 68, 68, 0.35);
}

.del-btn:hover {
  opacity: 1;
  transform: scale(1.06);
}

.del-btn.sm {
  width: 24px;
  height: 24px;
}

@media (hover: hover) {
  .del-btn {
    opacity: 0;
  }

  .slot-img-wrap:hover .del-btn,
  .del-btn:focus {
    opacity: 1;
  }
}

.fname {
  font-size: 11px;
  color: var(--xhs-text-secondary);
  display: block;
  margin-top: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.slot-missing,
.match-empty {
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--xhs-bg);
  border: 1px dashed var(--xhs-border);
  border-radius: 10px;
  font-size: 12px;
  color: #c0c4cc;
}

/* 文件网格 */
.file-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 14px;
}

.file-card {
  position: relative;
  border: 2px solid var(--xhs-border);
  border-radius: 14px;
  overflow: hidden;
  background: #fff;
  transition: all 0.2s;
}

.file-card:hover {
  box-shadow: var(--xhs-shadow-lg);
  transform: translateY(-2px);
}

.file-card.selected {
  border-color: var(--xhs-primary);
  box-shadow: 0 0 0 3px var(--xhs-primary-soft);
}

.file-select {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 3;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 6px;
  padding: 2px 4px;
}

.file-thumb {
  position: relative;
}

.file-thumb img {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  display: block;
}

.file-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px;
  opacity: 0;
  transition: opacity 0.2s;
}

.file-card:hover .file-overlay {
  opacity: 1;
}

.file-info {
  padding: 8px 10px;
  background: #fafbfc;
}

.file-name {
  font-size: 12px;
  font-weight: 500;
  color: var(--xhs-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
}

.match-desc {
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.match-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.match-slot {
  text-align: center;
}

.match-label {
  font-size: 13px;
  font-weight: 700;
  margin-bottom: 8px;
}

.match-slot img {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  border-radius: 10px;
}

.skip-item {
  font-size: 12px;
  color: var(--xhs-text-secondary);
  padding: 4px 0;
  border-bottom: 1px dashed var(--xhs-border);
}

.materials-flow-hint {
  margin-bottom: 16px;
}

.materials-flow-hint a {
  color: var(--xhs-primary);
  font-weight: 600;
}
</style>
