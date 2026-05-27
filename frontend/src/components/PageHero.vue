<template>
  <section class="page-hero" :style="{ '--hero-bg': `url(${image})` }">
    <div class="hero-overlay" />
    <div class="hero-content">
      <div class="hero-text">
        <span v-if="badge" class="hero-badge">{{ badge }}</span>
        <h1>{{ title }}</h1>
        <p v-if="subtitle">{{ subtitle }}</p>
        <div v-if="$slots.actions" class="hero-actions">
          <slot name="actions" />
        </div>
      </div>
      <div v-if="showVisual" class="hero-visual">
        <img :src="image" :alt="title" loading="lazy" />
      </div>
    </div>
  </section>
</template>

<script setup>
defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  image: { type: String, required: true },
  badge: { type: String, default: '' },
  showVisual: { type: Boolean, default: true },
});
</script>

<style scoped>
.page-hero {
  position: relative;
  border-radius: 20px;
  overflow: hidden;
  margin-bottom: 24px;
  min-height: 160px;
  background: #111118;
}

.hero-overlay {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(115deg, rgba(17, 17, 24, 0.92) 0%, rgba(17, 17, 24, 0.72) 45%, rgba(255, 36, 66, 0.18) 100%),
    var(--hero-bg) center / cover no-repeat;
}

.hero-content {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 28px 32px;
}

.hero-text {
  flex: 1;
  min-width: 0;
}

.hero-badge {
  display: inline-block;
  padding: 4px 12px;
  margin-bottom: 10px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #ffb3be;
  background: rgba(255, 36, 66, 0.15);
  border: 1px solid rgba(255, 36, 66, 0.25);
  border-radius: 999px;
}

.hero-text h1 {
  font-size: 28px;
  font-weight: 700;
  color: #fff;
  letter-spacing: -0.02em;
  line-height: 1.2;
}

.hero-text p {
  margin-top: 8px;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.72);
  line-height: 1.6;
  max-width: 520px;
}

.hero-actions {
  margin-top: 16px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.hero-visual {
  flex-shrink: 0;
  width: 120px;
  height: 120px;
  border-radius: 16px;
  overflow: hidden;
  border: 2px solid rgba(255, 255, 255, 0.12);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.35);
  display: none;
}

.hero-visual img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

@media (min-width: 768px) {
  .hero-visual {
    display: block;
  }

  .page-hero {
    min-height: 180px;
  }
}
</style>
