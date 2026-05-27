<template>
  <div class="page-container">
    <PageHero
      title="发布记录"
      subtitle="查看历史发布记录，支持详情查看与重新发布"
      :image="PLACEHOLDERS.records"
      badge="History"
    />

    <div class="card-section">
      <el-table :data="records" v-loading="loading" stripe>
        <el-table-column label="标题" prop="title" min-width="200" show-overflow-tooltip />
        <el-table-column label="状态" width="120">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)" size="small">
              {{ statusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="账号数" width="80">
          <template #default="{ row }">
            {{ row.items?.length || 0 }}
          </template>
        </el-table-column>
        <el-table-column label="成功/失败" width="100">
          <template #default="{ row }">
            <span style="color: #67c23a">{{ successCount(row) }}</span>
            /
            <span style="color: #f56c6c">{{ failedCount(row) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="发布时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="showDetail(row)">详情</el-button>
            <el-button link type="warning" @click="republish(row)">重新发布</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :total="total"
          layout="total, prev, pager, next"
          @current-change="loadRecords"
          @size-change="loadRecords"
        />
      </div>
    </div>

    <el-dialog v-model="detailVisible" title="发布详情" width="700px">
      <template v-if="currentRecord">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="标题" :span="2">{{ currentRecord.title }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="statusTagType(currentRecord.status)" size="small">
              {{ statusText(currentRecord.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="发布时间">{{ formatDate(currentRecord.createdAt) }}</el-descriptions-item>
        </el-descriptions>

        <div style="margin-top: 16px">
          <h4>正文</h4>
          <p class="content-text">{{ currentRecord.content }}</p>
        </div>

        <div style="margin-top: 12px">
          <el-tag v-for="tag in currentRecord.tags" :key="tag" style="margin: 2px">#{{ tag }}</el-tag>
        </div>

        <div v-if="currentRecord.imagePaths?.length" style="margin-top: 16px">
          <h4>图片</h4>
          <div class="image-preview-list">
            <div v-for="img in currentRecord.imagePaths" :key="img" class="image-preview-item">
              <img :src="getImageUrl(img)" alt="发布图片" />
            </div>
          </div>
        </div>

        <el-table :data="currentRecord.items" stripe style="margin-top: 16px">
          <el-table-column label="账号" prop="accountName" />
          <el-table-column label="状态">
            <template #default="{ row }">
              <el-tag :type="row.status === 'success' ? 'success' : 'danger'" size="small">
                {{ row.status === 'success' ? '成功' : '失败' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="详情" prop="message" />
        </el-table>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { recordApi, publishApi } from '@/api';
import PageHero from '@/components/PageHero.vue';
import { PLACEHOLDERS } from '@/constants/placeholders';
import { assetUrl } from '@/utils/assetUrl';

const records = ref([]);
const loading = ref(false);
const page = ref(1);
const pageSize = ref(20);
const total = ref(0);
const detailVisible = ref(false);
const currentRecord = ref(null);

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleString('zh-CN');
}

function statusText(status) {
  const map = { completed: '全部成功', failed: '全部失败', partial: '部分成功' };
  return map[status] || status;
}

function statusTagType(status) {
  const map = { completed: 'success', failed: 'danger', partial: 'warning' };
  return map[status] || 'info';
}

function successCount(row) {
  return row.items?.filter((i) => i.status === 'success').length || 0;
}

function failedCount(row) {
  return row.items?.filter((i) => i.status === 'failed').length || 0;
}

function getImageUrl(imgPath) {
  const filename = imgPath.split('/').pop();
  return assetUrl(`/uploads/${filename}`);
}

async function loadRecords() {
  loading.value = true;
  try {
    const res = await recordApi.list({ page: page.value, pageSize: pageSize.value });
    records.value = res.data.list;
    total.value = res.data.total;
  } catch {
    // 错误已处理
  } finally {
    loading.value = false;
  }
}

function showDetail(row) {
  currentRecord.value = row;
  detailVisible.value = true;
}

async function republish(row) {
  try {
    await publishApi.republish(row.id);
    ElMessage.success('重新发布任务已创建，请到发布页查看进度');
  } catch {
    // 错误已处理
  }
}

onMounted(loadRecords);
</script>

<style scoped>
.pagination {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

.content-text {
  white-space: pre-wrap;
  color: #606266;
  line-height: 1.6;
  background: #f5f7fa;
  padding: 12px;
  border-radius: 6px;
}
</style>
