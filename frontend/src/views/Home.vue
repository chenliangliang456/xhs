<template>
  <div class="home-page">
    <!-- 主视觉 Hero -->
    <section class="hero" :style="{ backgroundImage: `url(${PLACEHOLDERS.homeBanner})` }">
      <div class="hero-overlay" />
      <div class="hero-inner">
        <div class="hero-copy">
          <span class="hero-eyebrow">创作工作台</span>
          <h1>
            从小红书内容<br />
            <em>到多账号一键发布</em>
          </h1>
          <p>AI 批量生图 · ABC 套装 · 智能文案 · 浏览器自动发布，一站式内容生产流水线</p>
          <div class="hero-actions">
            <router-link to="/batch-image">
              <el-button type="primary" size="large" class="btn-hero">
                <el-icon><MagicStick /></el-icon>
                开始生图
              </el-button>
            </router-link>
            <router-link to="/publish">
              <el-button size="large" class="btn-hero-outline">
                <el-icon><Upload /></el-icon>
                一键发布
              </el-button>
            </router-link>
          </div>
        </div>
        <div class="hero-visual">
          <img :src="PLACEHOLDERS.home" alt="创作工作台" loading="eager" />
          <div class="hero-float hero-float-1">
            <span class="dot green" /> 服务运行中
          </div>
          <div class="hero-float hero-float-2">
            <el-icon><Picture /></el-icon> ABC 成套素材
          </div>
        </div>
      </div>
    </section>

    <!-- 快捷入口 Bento Grid -->
    <section class="section">
      <div class="section-head">
        <h2>快捷入口</h2>
        <p>选择功能模块，开始你的创作流程</p>
      </div>
      <div class="bento-grid">
        <router-link
          v-for="card in FEATURE_CARDS"
          :key="card.path"
          :to="card.path"
          class="bento-card"
          :class="{ featured: card.featured }"
        >
          <img :src="card.image" :alt="card.title" class="bento-bg" loading="lazy" />
          <div class="bento-overlay" :style="{ '--accent': card.accent }" />
          <div class="bento-content">
            <div class="bento-icon" :style="{ background: card.accent }">
              <el-icon :size="22"><component :is="card.icon" /></el-icon>
            </div>
            <h3>{{ card.title }}</h3>
            <p>{{ card.desc }}</p>
            <span class="bento-arrow">
              进入 <el-icon><ArrowRight /></el-icon>
            </span>
          </div>
        </router-link>
      </div>
    </section>

    <!-- 工作流 -->
    <section class="section">
      <div class="workflow-card card-section">
        <div class="workflow-left">
          <div class="section-head inline">
            <h2>完整工作流</h2>
            <p>从生图到发布，五步搞定</p>
          </div>
          <div class="workflow-steps">
            <router-link
              v-for="step in WORKFLOW_STEPS"
              :key="step.num"
              :to="step.to"
              class="wf-step wf-step-link"
            >
              <div class="wf-num">{{ String(step.num).padStart(2, '0') }}</div>
              <div class="wf-body">
                <div class="wf-title">
                  <el-icon><component :is="step.icon" /></el-icon>
                  {{ step.title }}
                  <el-icon class="wf-arrow"><ArrowRight /></el-icon>
                </div>
                <p>{{ step.desc }}</p>
              </div>
            </router-link>
          </div>
          <router-link to="/batch-image">
            <el-button type="primary">
              立即开始 <el-icon class="ml-1"><ArrowRight /></el-icon>
            </el-button>
          </router-link>
        </div>
        <div class="workflow-right">
          <img :src="PLACEHOLDERS.workflow" alt="工作流" loading="lazy" />
          <div class="abc-badge">
            <img :src="PLACEHOLDERS.abcSet" alt="ABC 套装" />
            <span>A → B 五宫格 → C 产品信息</span>
          </div>
        </div>
      </div>
    </section>

    <!-- 状态栏 -->
    <section class="section">
      <div class="stats-row">
        <div class="stat-card">
          <div class="stat-icon" style="background: rgba(255,36,66,0.1); color: #ff2442">
            <el-icon :size="24"><Monitor /></el-icon>
          </div>
          <div>
            <span class="stat-label">后端服务</span>
            <span class="stat-value">{{ healthOk ? '运行正常' : '未连接' }}</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background: rgba(99,102,241,0.1); color: #6366f1">
            <el-icon :size="24"><MagicStick /></el-icon>
          </div>
          <div>
            <span class="stat-label">AI 生图</span>
            <span class="stat-value">{{ imageGenOk ? '已配置' : '待配置' }}</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background: rgba(16,185,129,0.1); color: #10b981">
            <el-icon :size="24"><Promotion /></el-icon>
          </div>
          <div>
            <span class="stat-label">发布模式</span>
            <span class="stat-value">浏览器自动</span>
          </div>
        </div>
        <router-link to="/settings" class="stat-card stat-link">
          <div class="stat-icon" style="background: rgba(100,116,139,0.1); color: #64748b">
            <el-icon :size="24"><Setting /></el-icon>
          </div>
          <div>
            <span class="stat-label">系统设置</span>
            <span class="stat-value">查看配置 →</span>
          </div>
        </router-link>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import {
  MagicStick,
  Upload,
  Picture,
  ArrowRight,
  Monitor,
  Promotion,
  Setting,
} from '@element-plus/icons-vue';
import { PLACEHOLDERS, FEATURE_CARDS, WORKFLOW_STEPS } from '@/constants/placeholders';
import { healthApi, imageGenApi } from '@/api';

const healthOk = ref(false);
const imageGenOk = ref(false);

onMounted(async () => {
  try {
    await healthApi.check();
    healthOk.value = true;
  } catch {
    healthOk.value = false;
  }
  try {
    const data = await imageGenApi.health();
    imageGenOk.value = data.apiConfigured === true;
  } catch {
    imageGenOk.value = false;
  }
});
</script>

<style scoped>
.home-page {
  min-height: 100%;
}

/* Hero */
.hero {
  position: relative;
  min-height: 420px;
  background-size: cover;
  background-position: center;
  overflow: hidden;
}

.hero-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    135deg,
    rgba(12, 12, 16, 0.88) 0%,
    rgba(12, 12, 16, 0.65) 45%,
    rgba(255, 36, 66, 0.2) 100%
  );
}

.hero-inner {
  position: relative;
  z-index: 1;
  max-width: 1280px;
  margin: 0 auto;
  padding: 48px 28px 56px;
  display: flex;
  align-items: center;
  gap: 48px;
}

.hero-copy {
  flex: 1;
  min-width: 0;
}

.hero-eyebrow {
  display: inline-block;
  padding: 6px 14px;
  margin-bottom: 16px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #ffb3be;
  background: rgba(255, 36, 66, 0.15);
  border: 1px solid rgba(255, 36, 66, 0.3);
  border-radius: 999px;
}

.hero-copy h1 {
  font-size: clamp(32px, 5vw, 48px);
  font-weight: 800;
  color: #fff;
  line-height: 1.15;
  letter-spacing: -0.03em;
}

.hero-copy h1 em {
  font-style: normal;
  background: linear-gradient(90deg, #ff6b81, #ffb3be);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-copy > p {
  margin-top: 16px;
  font-size: 16px;
  color: rgba(255, 255, 255, 0.72);
  line-height: 1.7;
  max-width: 480px;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 28px;
}

.hero-actions a {
  text-decoration: none;
}

.btn-hero {
  height: 48px !important;
  padding: 0 28px !important;
  font-size: 15px !important;
  border-radius: 14px !important;
  box-shadow: 0 8px 24px rgba(255, 36, 66, 0.4) !important;
}

.btn-hero-outline {
  height: 48px !important;
  padding: 0 28px !important;
  font-size: 15px !important;
  border-radius: 14px !important;
  background: rgba(255, 255, 255, 0.12) !important;
  border: 1px solid rgba(255, 255, 255, 0.25) !important;
  color: #fff !important;
  backdrop-filter: blur(8px);
}

.btn-hero-outline:hover {
  background: rgba(255, 255, 255, 0.2) !important;
}

.hero-visual {
  position: relative;
  flex-shrink: 0;
  width: 320px;
  display: none;
}

.hero-visual > img {
  width: 100%;
  aspect-ratio: 4/5;
  object-fit: cover;
  border-radius: 24px;
  border: 2px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 32px 64px rgba(0, 0, 0, 0.4);
}

.hero-float {
  position: absolute;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  font-size: 13px;
  font-weight: 600;
  color: var(--xhs-text);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  white-space: nowrap;
}

.hero-float-1 {
  top: 20px;
  right: -20px;
}

.hero-float-2 {
  bottom: 40px;
  left: -24px;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.dot.green {
  background: #10b981;
  box-shadow: 0 0 8px #10b981;
}

@media (min-width: 960px) {
  .hero-visual {
    display: block;
  }
}

/* Section */
.section {
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 28px 32px;
}

.section-head {
  margin-bottom: 20px;
}

.section-head.inline {
  margin-bottom: 24px;
}

.section-head h2 {
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--xhs-text);
}

.section-head p {
  margin-top: 4px;
  font-size: 14px;
  color: var(--xhs-text-secondary);
}

/* Bento Grid */
.bento-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: auto auto;
  gap: 16px;
}

.bento-card {
  position: relative;
  border-radius: 20px;
  overflow: hidden;
  min-height: 180px;
  text-decoration: none;
  display: block;
  transition: transform 0.25s ease, box-shadow 0.25s ease;
  border: 1px solid var(--xhs-border);
}

.bento-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--xhs-shadow-lg);
}

.bento-card.featured {
  grid-row: span 2;
  min-height: 100%;
}

.bento-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.4s ease;
}

.bento-card:hover .bento-bg {
  transform: scale(1.06);
}

.bento-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to top,
    rgba(0, 0, 0, 0.75) 0%,
    rgba(0, 0, 0, 0.2) 50%,
    rgba(0, 0, 0, 0.05) 100%
  );
}

.bento-content {
  position: relative;
  z-index: 1;
  height: 100%;
  padding: 20px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  color: #fff;
}

.bento-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
  color: #fff;
}

.bento-content h3 {
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.bento-content p {
  font-size: 13px;
  opacity: 0.8;
  margin-top: 4px;
}

.bento-arrow {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 12px;
  font-size: 13px;
  font-weight: 600;
  opacity: 0;
  transform: translateY(6px);
  transition: opacity 0.2s, transform 0.2s;
}

.bento-card:hover .bento-arrow {
  opacity: 1;
  transform: translateY(0);
}

@media (max-width: 900px) {
  .bento-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .bento-card.featured {
    grid-row: span 1;
  }
}

@media (max-width: 560px) {
  .bento-grid {
    grid-template-columns: 1fr;
  }
}

/* Workflow */
.workflow-card {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 40px;
  padding: 32px !important;
  align-items: center;
}

.workflow-steps {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 24px;
}

.wf-step {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.wf-step-link {
  text-decoration: none;
  color: inherit;
  padding: 10px 12px;
  margin: -10px -12px;
  border-radius: 12px;
  transition: background 0.2s;
}

.wf-step-link:hover {
  background: var(--xhs-primary-soft);
}

.wf-arrow {
  margin-left: auto;
  font-size: 14px;
  color: var(--xhs-text-secondary);
  opacity: 0;
  transition: opacity 0.2s;
}

.wf-step-link:hover .wf-arrow {
  opacity: 1;
  color: var(--xhs-primary);
}

.wf-num {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: var(--xhs-primary-soft);
  color: var(--xhs-primary);
  font-size: 13px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
}

.wf-title {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  font-size: 15px;
  font-weight: 700;
  color: var(--xhs-text);
}

.wf-body p {
  font-size: 13px;
  color: var(--xhs-text-secondary);
  margin-top: 2px;
}

.workflow-right {
  position: relative;
  border-radius: 20px;
  overflow: hidden;
}

.workflow-right > img {
  width: 100%;
  aspect-ratio: 4/3;
  object-fit: cover;
  border-radius: 20px;
}

.abc-badge {
  position: absolute;
  bottom: 16px;
  left: 16px;
  right: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(8px);
  border-radius: 14px;
  font-size: 13px;
  font-weight: 600;
  color: var(--xhs-text);
}

.abc-badge img {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  object-fit: cover;
}

@media (max-width: 768px) {
  .workflow-card {
    grid-template-columns: 1fr;
  }
}

/* Stats */
.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 20px;
  background: var(--xhs-surface);
  border: 1px solid var(--xhs-border);
  border-radius: var(--xhs-radius);
  box-shadow: var(--xhs-shadow);
  transition: box-shadow 0.2s, transform 0.2s;
}

.stat-link {
  text-decoration: none;
  color: inherit;
  cursor: pointer;
}

.stat-link:hover {
  transform: translateY(-2px);
  box-shadow: var(--xhs-shadow-lg);
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-label {
  display: block;
  font-size: 12px;
  color: var(--xhs-text-secondary);
  font-weight: 500;
}

.stat-value {
  display: block;
  font-size: 15px;
  font-weight: 700;
  color: var(--xhs-text);
  margin-top: 2px;
}

@media (max-width: 900px) {
  .stats-row {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 480px) {
  .stats-row {
    grid-template-columns: 1fr;
  }
}

.ml-1 {
  margin-left: 4px;
}
</style>
