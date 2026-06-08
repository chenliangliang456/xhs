<template>
  <div class="page-container copy-viral-page">
    <PageHero
      title="爆款文案生成"
      subtitle="DeepSeek 生成小红书爆款文案（含套装编号、配图理解）；仅生成文案，不会自动发帖"
      :image="PLACEHOLDERS.publish"
      badge="AI Copy"
    >
      <template #actions>
        <router-link to="/publish">
          <el-button>去发布草稿</el-button>
        </router-link>
      </template>
    </PageHero>

    <div class="card-section">
      <el-alert type="info" :closable="false" show-icon style="margin-bottom: 20px">
        从素材库选一套 <strong>aN + bN + cN</strong> 时，会自动识别套装编号并理解配图；不配图为纯文字爆款模式。
        AI 配置见 <router-link to="/settings?tab=ai">系统设置 · AI</router-link>。
      </el-alert>

      <el-form label-width="100px" class="product-form">
        <el-form-item label="产品名称" required>
          <el-input v-model="productForm.productName" placeholder="例：种子纸吊牌" />
        </el-form-item>
        <el-form-item label="产品卖点">
          <el-input v-model="productForm.sellingPoints" type="textarea" :rows="2" placeholder="核心卖点、差异化" />
        </el-form-item>
        <el-form-item label="产品类型">
          <el-input v-model="productForm.productType" placeholder="可选" />
        </el-form-item>
        <el-form-item label="适用人群">
          <el-input v-model="productForm.targetAudience" placeholder="可选" />
        </el-form-item>
        <el-form-item label="风格">
          <el-input v-model="productForm.style" placeholder="默认：口语化种草风" />
        </el-form-item>
        <el-form-item label="套装编号">
          <el-input
            v-model="manualSetIndex"
            clearable
            placeholder="一般无需填写：选素材库套装后会自动识别；不配图文案时可手填 N 以使用 aN/bN/cN 提示词"
            style="max-width: 420px"
          />
        </el-form-item>
      </el-form>
    </div>

    <div class="card-section">
      <div class="section-title">配图（可选）</div>
      <MaterialSelector v-model="images" />
      <p v-if="effectiveSetIndex" class="hint-line">
        当前将按<strong>套装 #{{ effectiveSetIndex }}</strong> 生成（含配图理解）。
      </p>
    </div>

    <div class="card-section actions-bar">
      <el-button type="primary" size="large" :loading="generating" @click="runGenerate">
        生成爆款文案
      </el-button>
    </div>

    <div v-if="result.title || result.content" class="card-section result-block">
      <div class="section-title">生成结果</div>
      <div class="result-row">
        <span class="label">标题</span>
        <p class="result-text">{{ result.title }}</p>
        <el-button text type="primary" @click="copyText(result.title)">复制</el-button>
      </div>
      <div class="result-row block">
        <span class="label">正文</span>
        <el-input v-model="result.content" type="textarea" :rows="12" class="mono" />
        <el-button text type="primary" @click="copyText(result.content)">复制正文</el-button>
      </div>
      <div class="result-row">
        <span class="label">标签</span>
        <div class="tags-wrap">
          <el-tag v-for="(t, i) in result.tags" :key="i" style="margin: 4px">{{ t }}</el-tag>
        </div>
        <el-button text type="primary" @click="copyText(result.tags.join(' '))">复制标签</el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, computed } from 'vue';
import { ElMessage } from 'element-plus';
import PageHero from '@/components/PageHero.vue';
import MaterialSelector from '@/components/MaterialSelector.vue';
import { PLACEHOLDERS } from '@/constants/placeholders';
import { aiApi, buildImageSources } from '@/api';

const productForm = reactive({
  productName: '',
  sellingPoints: '',
  productType: '',
  targetAudience: '',
  style: '口语化种草风',
});

const images = ref([]);
const manualSetIndex = ref('');
const generating = ref(false);
const result = reactive({
  title: '',
  content: '',
  tags: [],
});

const effectiveSetIndex = computed(() => {
  const m = manualSetIndex.value.trim();
  if (m) return m;
  const img = images.value.find((i) => i.index != null && String(i.index).trim() !== '');
  return img ? String(img.index) : '';
});

function copyText(text) {
  if (!text) return;
  navigator.clipboard.writeText(text);
  ElMessage.success('已复制');
}

async function runGenerate() {
  if (!productForm.productName.trim()) {
    ElMessage.warning('请输入产品名称');
    return;
  }
  generating.value = true;
  try {
    const res = await aiApi.generateViral({
      productName: productForm.productName.trim(),
      sellingPoints: productForm.sellingPoints || '',
      productType: productForm.productType || '',
      targetAudience: productForm.targetAudience || '',
      style: productForm.style || '口语化种草风',
      imageSources: buildImageSources(images.value),
      setIndex: effectiveSetIndex.value || undefined,
    });
    result.title = res.data.title || '';
    result.content = res.data.content || '';
    result.tags = Array.isArray(res.data.tags) ? [...res.data.tags] : [];
    if (res.meta?.mock) {
      ElMessage.warning(res.message || '已使用本地模拟文案');
    } else {
      ElMessage.success(res.message || '生成成功');
    }
  } catch {
    // 拦截器已提示
  } finally {
    generating.value = false;
  }
}
</script>

<style scoped>
.section-title {
  font-size: 16px;
  font-weight: 700;
  margin-bottom: 12px;
}

.product-form {
  max-width: 720px;
}

.hint-line {
  margin-top: 12px;
  font-size: 13px;
  color: var(--xhs-text-secondary);
}

.actions-bar {
  display: flex;
  align-items: center;
  gap: 12px;
}

.result-block .result-row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 8px 12px;
  margin-bottom: 16px;
}

.result-row.block {
  flex-direction: column;
  align-items: stretch;
}

.result-row .label {
  min-width: 48px;
  font-weight: 600;
  color: var(--xhs-text-secondary);
  font-size: 13px;
}

.result-text {
  flex: 1;
  margin: 0;
  font-size: 15px;
  line-height: 1.5;
}

.tags-wrap {
  flex: 1;
}

.mono :deep(textarea) {
  font-family: inherit;
}
</style>
