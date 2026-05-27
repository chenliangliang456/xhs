<template>
  <el-container class="main-layout">
    <el-aside :width="collapsed ? '72px' : 'var(--sidebar-width)'" class="sidebar">
      <router-link to="/home" class="brand">
        <div class="brand-mark">红</div>
        <div v-show="!collapsed" class="brand-text">
          <span class="brand-name">创作工作台</span>
          <span class="brand-sub">小红书智能发布</span>
        </div>
      </router-link>

      <nav class="nav-menu">
        <router-link
          v-for="item in menuItems"
          :key="item.path"
          :to="item.path"
          class="nav-item"
          :class="{ active: isActive(item.path) }"
        >
          <el-icon :size="20"><component :is="item.icon" /></el-icon>
          <div v-show="!collapsed" class="nav-label">
            <span>{{ item.title }}</span>
            <small>{{ item.desc }}</small>
          </div>
        </router-link>
      </nav>

      <div class="sidebar-footer">
        <el-dropdown trigger="click" @command="handleCommand">
          <div class="user-card" :class="{ compact: collapsed }">
            <el-avatar :size="36" class="user-avatar">
              {{ username.charAt(0).toUpperCase() }}
            </el-avatar>
            <div v-show="!collapsed" class="user-meta">
              <span class="user-name">{{ username }}</span>
              <span class="user-role">管理员</span>
            </div>
            <el-icon v-show="!collapsed" class="user-arrow"><ArrowDown /></el-icon>
          </div>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="home">
                <el-icon><HomeFilled /></el-icon> 返回主界面
              </el-dropdown-item>
              <el-dropdown-item command="settings">
                <el-icon><Setting /></el-icon> 系统设置
              </el-dropdown-item>
              <el-dropdown-item divided command="logout">
                <el-icon><SwitchButton /></el-icon> 退出登录
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </el-aside>

    <el-container class="main-panel">
      <el-header class="topbar">
        <div class="topbar-left">
          <router-link to="/home" class="home-link" title="返回主界面">
            <el-icon :size="18"><HomeFilled /></el-icon>
          </router-link>
          <el-breadcrumb separator="/">
            <el-breadcrumb-item>
              <router-link to="/home">主界面</router-link>
            </el-breadcrumb-item>
            <el-breadcrumb-item v-if="route.path !== '/home'">{{ currentTitle }}</el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div class="topbar-right">
          <el-button text @click="collapsed = !collapsed">
            <el-icon><Fold v-if="!collapsed" /><Expand v-else /></el-icon>
          </el-button>
        </div>
      </el-header>

      <el-main class="main-content" :class="{ 'is-home': route.path === '/home' }">
        <router-view v-slot="{ Component }">
          <transition name="fade-slide" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useUserStore } from '@/stores/user';
import { ArrowDown, Fold, Expand, Setting, SwitchButton, HomeFilled } from '@element-plus/icons-vue';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

const collapsed = ref(false);

const menuItems = [
  { path: '/home', title: '主界面', desc: '工作台首页', icon: 'HomeFilled' },
  { path: '/batch-image', title: '批量生图', desc: 'AI · ABC 套装', icon: 'MagicStick' },
  { path: '/materials', title: '素材库', desc: 'A/B/C 成套', icon: 'Picture' },
  { path: '/copy-viral', title: '爆款文案', desc: '同款 AI · 只生文', icon: 'EditPen' },
  { path: '/publish', title: '一键发布', desc: 'AI 文案 · 多账号', icon: 'Upload' },
  { path: '/accounts', title: '账号管理', desc: '登录与 Cookie', icon: 'User' },
  { path: '/records', title: '发布记录', desc: '历史与重发', icon: 'Document' },
  { path: '/settings', title: '系统设置', desc: 'API 配置', icon: 'Setting' },
];

const username = computed(() => userStore.username || 'Admin');
const currentTitle = computed(() => route.meta?.title || '主界面');

function isActive(path) {
  return route.path === path;
}

onMounted(() => {
  userStore.fetchProfile();
});

function handleCommand(cmd) {
  if (cmd === 'logout') {
    userStore.logout();
    router.push('/login');
  } else if (cmd === 'settings') {
    router.push('/settings');
  } else if (cmd === 'home') {
    router.push('/home');
  }
}
</script>

<style scoped>
.main-layout {
  height: 100vh;
  background: var(--xhs-bg);
}

.sidebar {
  background: #0a0a0f;
  background: var(--sidebar-bg);
  display: flex;
  flex-direction: column;
  transition: width 0.28s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  border-right: 1px solid rgba(255, 255, 255, 0.06);
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 18px;
  cursor: pointer;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  text-decoration: none;
  transition: background 0.2s;
}

.brand:hover {
  background: rgba(255, 255, 255, 0.04);
}

.brand-mark {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #ff2442, #ff6b81);
  border-radius: 12px;
  color: #fff;
  font-weight: 800;
  font-size: 16px;
  box-shadow: 0 8px 20px rgba(255, 36, 66, 0.35);
}

.brand-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.brand-name {
  color: #fff;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.brand-sub {
  color: rgba(255, 255, 255, 0.45);
  font-size: 11px;
  margin-top: 2px;
}

.nav-menu {
  flex: 1;
  padding: 16px 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow-y: auto;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 12px;
  color: rgba(255, 255, 255, 0.55);
  text-decoration: none;
  transition: all 0.2s ease;
}

.nav-item:hover {
  color: rgba(255, 255, 255, 0.9);
  background: rgba(255, 255, 255, 0.06);
}

.nav-item.active {
  color: #fff;
  background: linear-gradient(135deg, rgba(255, 36, 66, 0.22), rgba(255, 36, 66, 0.08));
  box-shadow: inset 0 0 0 1px rgba(255, 36, 66, 0.25);
}

.nav-item.active .el-icon {
  color: #ff6b81;
}

.nav-label {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.nav-label span {
  font-size: 14px;
  font-weight: 600;
}

.nav-label small {
  font-size: 11px;
  opacity: 0.55;
  margin-top: 1px;
}

.sidebar-footer {
  padding: 14px 10px 18px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.user-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 12px;
  cursor: pointer;
  transition: background 0.2s;
}

.user-card:hover {
  background: rgba(255, 255, 255, 0.06);
}

.user-card.compact {
  justify-content: center;
  padding: 10px;
}

.user-avatar {
  background: linear-gradient(135deg, #6366f1, #8b5cf6) !important;
  font-weight: 700;
  flex-shrink: 0;
}

.user-meta {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.user-name {
  color: #fff;
  font-size: 13px;
  font-weight: 600;
}

.user-role {
  color: rgba(255, 255, 255, 0.4);
  font-size: 11px;
}

.user-arrow {
  color: rgba(255, 255, 255, 0.35);
  font-size: 12px;
}

.main-panel {
  flex-direction: column;
  min-width: 0;
}

.topbar {
  height: 56px !important;
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--xhs-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
}

.topbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.home-link {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  color: var(--xhs-text-secondary);
  transition: all 0.2s;
}

.home-link:hover {
  background: var(--xhs-primary-soft);
  color: var(--xhs-primary);
}

.topbar-left :deep(.el-breadcrumb__inner) {
  font-weight: 500;
  color: var(--xhs-text-secondary);
}

.topbar-left :deep(.el-breadcrumb__item:last-child .el-breadcrumb__inner) {
  color: var(--xhs-text);
  font-weight: 600;
}

.topbar-left :deep(.el-breadcrumb__inner a) {
  color: var(--xhs-text-secondary);
  font-weight: 500;
  text-decoration: none;
}

.topbar-left :deep(.el-breadcrumb__inner a:hover) {
  color: var(--xhs-primary);
}

.main-content {
  padding: 0;
  overflow-y: auto;
  background:
    radial-gradient(ellipse at 20% 0%, rgba(255, 36, 66, 0.04) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 100%, rgba(99, 102, 241, 0.04) 0%, transparent 50%),
    var(--xhs-bg);
}

.main-content.is-home {
  background: var(--xhs-bg);
}

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: opacity 0.22s ease, transform 0.22s ease;
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
