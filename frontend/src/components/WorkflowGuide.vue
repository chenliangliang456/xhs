<template>
  <div class="workflow-guide card-section" :class="{ compact }">
    <div class="guide-head">
      <div>
        <h3 class="guide-title">{{ title }}</h3>
        <p v-if="subtitle" class="guide-sub">{{ subtitle }}</p>
      </div>
      <slot name="extra" />
    </div>
    <div class="guide-steps">
      <component
        :is="step.to ? 'router-link' : 'div'"
        v-for="step in steps"
        :key="step.num"
        :to="step.to"
        class="guide-step"
        :class="{
          active: activeStep === step.num,
          done: activeStep > step.num,
          clickable: !!step.to,
        }"
        @click="!step.to && $emit('step-click', step)"
      >
        <span class="step-num">{{ step.num }}</span>
        <div class="step-body">
          <span class="step-title">
            <el-icon v-if="step.icon"><component :is="step.icon" /></el-icon>
            {{ step.title }}
          </span>
          <span class="step-desc">{{ step.desc }}</span>
        </div>
      </component>
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: { type: String, default: '推荐流程' },
  subtitle: { type: String, default: '' },
  steps: { type: Array, required: true },
  /** 当前进行到的步骤序号（1-based） */
  activeStep: { type: Number, default: 1 },
  compact: { type: Boolean, default: false },
});

defineEmits(['step-click']);
</script>

<style scoped>
.workflow-guide {
  padding: 20px 24px !important;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.04), rgba(255, 36, 66, 0.03));
  border: 1px solid var(--xhs-border);
}

.guide-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.guide-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--xhs-text);
}

.guide-sub {
  margin-top: 4px;
  font-size: 13px;
  color: var(--xhs-text-secondary);
}

.guide-steps {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 10px;
}

.guide-step {
  display: flex;
  gap: 10px;
  padding: 12px;
  border-radius: 12px;
  background: var(--xhs-surface);
  border: 1px solid var(--xhs-border);
  text-decoration: none;
  color: inherit;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.guide-step.clickable:hover {
  border-color: var(--xhs-primary);
  box-shadow: var(--xhs-shadow);
}

.guide-step.active {
  border-color: var(--xhs-primary);
  box-shadow: 0 0 0 2px rgba(255, 36, 66, 0.12);
  background: #fff;
}

.guide-step.done .step-num {
  background: rgba(16, 185, 129, 0.15);
  color: #059669;
}

.step-num {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: var(--xhs-primary-soft);
  color: var(--xhs-primary);
  font-size: 12px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
}

.step-body {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.step-title {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  font-weight: 700;
  color: var(--xhs-text);
}

.step-desc {
  font-size: 11px;
  color: var(--xhs-text-secondary);
  line-height: 1.35;
}

.workflow-guide.compact .guide-steps {
  grid-template-columns: repeat(5, minmax(0, 1fr));
}

.workflow-guide.compact .guide-step {
  padding: 10px;
}

@media (max-width: 1100px) {
  .guide-steps {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 640px) {
  .guide-steps {
    grid-template-columns: 1fr;
  }
}
</style>
