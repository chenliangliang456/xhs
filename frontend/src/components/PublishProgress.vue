<template>
  <div v-if="task" class="publish-progress">
    <el-alert
      :title="statusText"
      :type="statusType"
      show-icon
      :closable="false"
      style="margin-bottom: 20px"
    />

    <el-table :data="task.items" stripe>
      <el-table-column label="账号" prop="accountName" width="180" />
      <el-table-column label="状态" width="140">
        <template #default="{ row }">
          <span :class="['status-dot', row.status]"></span>
          {{ statusLabel(row.status) }}
        </template>
      </el-table-column>
      <el-table-column label="详情" prop="message" />
      <el-table-column label="笔记ID" prop="noteId" width="200">
        <template #default="{ row }">
          <span v-if="row.noteId">{{ row.noteId }}</span>
          <span v-else class="text-muted">-</span>
        </template>
      </el-table-column>
      <el-table-column label="重试" width="80">
        <template #default="{ row }">
          {{ row.retries || 0 }}
        </template>
      </el-table-column>
    </el-table>

    <div v-if="isFinished" class="summary-box">
      <el-row :gutter="24">
        <el-col :span="8">
          <div class="stat-card success">
            <span class="stat-value">{{ successCount }}</span>
            <span class="stat-label">成功</span>
          </div>
        </el-col>
        <el-col :span="8">
          <div class="stat-card failed">
            <span class="stat-value">{{ failedCount }}</span>
            <span class="stat-label">失败</span>
          </div>
        </el-col>
        <el-col :span="8">
          <div class="stat-card total">
            <span class="stat-value">{{ task.items.length }}</span>
            <span class="stat-label">总计</span>
          </div>
        </el-col>
      </el-row>
    </div>
  </div>
  <el-empty v-else description="暂无发布任务" />
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  task: { type: Object, default: null },
});

const statusMap = {
  waiting: '等待中',
  publishing: '发布中',
  retrying: '重试中',
  success: '发布成功',
  failed: '发布失败',
};

const statusLabel = (s) => statusMap[s] || s;

const isFinished = computed(() =>
  props.task && ['completed', 'failed', 'partial'].includes(props.task.status)
);

const successCount = computed(
  () => props.task?.items?.filter((i) => i.status === 'success').length || 0
);

const failedCount = computed(
  () => props.task?.items?.filter((i) => i.status === 'failed').length || 0
);

const hasMock = computed(() =>
  props.task?.items?.some((i) => i.message?.includes('模拟'))
);

const statusText = computed(() => {
  const map = {
    pending: '任务等待中...',
    running: '正在通过浏览器发布（每个账号约 30-60 秒）...',
    completed: hasMock.value ? '任务完成（含模拟发布，请查看详情）' : '全部发布成功！',
    failed: '全部发布失败',
    partial: '部分账号发布成功',
  };
  return map[props.task?.status] || '未知状态';
});

const statusType = computed(() => {
  const map = {
    pending: 'info',
    running: 'info',
    completed: 'success',
    failed: 'error',
    partial: 'warning',
  };
  return map[props.task?.status] || 'info';
});
</script>

<style scoped>
.summary-box {
  margin-top: 24px;
}

.stat-card {
  text-align: center;
  padding: 20px;
  border-radius: var(--xhs-radius-sm);
  border: 1px solid var(--xhs-border);
}

.stat-card.success {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(16, 185, 129, 0.02));
}

.stat-card.failed {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.08), rgba(239, 68, 68, 0.02));
}

.stat-card.total {
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(99, 102, 241, 0.02));
}

.stat-value {
  display: block;
  font-size: 32px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--xhs-text);
}

.stat-label {
  display: block;
  margin-top: 4px;
  font-size: 13px;
  color: var(--xhs-text-secondary);
  font-weight: 500;
}

.text-muted {
  color: #c0c4cc;
}
</style>
