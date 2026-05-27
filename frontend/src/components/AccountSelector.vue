<template>
  <div class="account-selector">
    <div v-if="loading" class="loading-box">
      <el-skeleton :rows="3" animated />
    </div>

    <el-empty v-else-if="accounts.length === 0" description="暂无账号，请先到账号管理添加">
      <el-button type="primary" @click="$router.push('/accounts')">去添加账号</el-button>
    </el-empty>

    <template v-else>
      <div class="selector-toolbar">
        <el-checkbox
          :model-value="isAllSelected"
          :indeterminate="isIndeterminate"
          @change="toggleSelectAll"
        >
          全选（{{ enabledAccounts.length }} 个可用账号）
        </el-checkbox>
      </div>

      <el-checkbox-group :model-value="modelValue" @change="emit('update:modelValue', $event)">
        <div class="account-grid">
          <div
            v-for="account in accounts"
            :key="account.id"
            class="account-card"
            :class="{ disabled: !account.enabled }"
          >
            <el-checkbox :label="account.id" :disabled="!account.enabled">
              <div class="account-info">
                <el-avatar :size="40" style="background: #ff2442">
                  {{ account.name.charAt(0) }}
                </el-avatar>
                <div class="account-detail">
                  <span class="name">{{ account.name }}</span>
                  <span class="meta">
                    {{
                      account.loginType === 'browser' || account.loginType === 'qrcode' || account.authType === 'cookie'
                        ? '✅ 可自动发布'
                        : '⚠️ 需改浏览器/Cookie 登录'
                    }}
                    · {{ account.enabled ? '已启用' : '已禁用' }}
                  </span>
                </div>
              </div>
            </el-checkbox>
          </div>
        </div>
      </el-checkbox-group>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { accountApi } from '@/api';

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
});

const emit = defineEmits(['update:modelValue']);

const accounts = ref([]);
const loading = ref(true);

const enabledAccounts = computed(() => accounts.value.filter((a) => a.enabled));

const isAllSelected = computed(
  () =>
    enabledAccounts.value.length > 0 &&
    enabledAccounts.value.every((a) => props.modelValue.includes(a.id))
);

const isIndeterminate = computed(
  () =>
    props.modelValue.length > 0 &&
    props.modelValue.length < enabledAccounts.value.length
);

function toggleSelectAll(val) {
  if (val) {
    emit(
      'update:modelValue',
      enabledAccounts.value.map((a) => a.id)
    );
  } else {
    emit('update:modelValue', []);
  }
}

onMounted(async () => {
  try {
    const res = await accountApi.list();
    accounts.value = res.data;
  } catch {
    // 错误已处理
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.selector-toolbar {
  margin-bottom: 16px;
}

.account-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
}

.account-card {
  padding: 16px;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  background: #fafafa;
  transition: border-color 0.3s;
}

.account-card:hover {
  border-color: var(--xhs-primary);
}

.account-card.disabled {
  opacity: 0.5;
}

.account-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.account-detail {
  display: flex;
  flex-direction: column;
}

.account-detail .name {
  font-weight: 600;
  font-size: 14px;
}

.account-detail .meta {
  font-size: 12px;
  color: #909399;
  margin-top: 2px;
}
</style>
