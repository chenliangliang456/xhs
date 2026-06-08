import { createRouter, createWebHistory } from 'vue-router';

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { public: true },
  },
  {
    path: '/',
    component: () => import('@/layouts/MainLayout.vue'),
    redirect: '/home',
    children: [
      {
        path: 'home',
        name: 'Home',
        component: () => import('@/views/Home.vue'),
        meta: { title: '主界面', icon: 'HomeFilled' },
      },
      {
        path: 'batch-image',
        name: 'BatchImageGen',
        component: () => import('@/views/BatchImageGen.vue'),
        meta: { title: '批量生图', icon: 'MagicStick' },
      },
      {
        path: 'materials',
        name: 'Materials',
        component: () => import('@/views/Materials.vue'),
        meta: { title: '我的素材库', icon: 'Picture' },
      },
      {
        path: 'copy-viral',
        name: 'CopyViral',
        component: () => import('@/views/CopyViral.vue'),
        meta: { title: '爆款文案', icon: 'EditPen' },
      },
      {
        path: 'publish',
        name: 'Publish',
        component: () => import('@/views/Publish.vue'),
        meta: { title: '发布草稿', icon: 'DocumentCopy' },
      },
      {
        path: 'settings',
        name: 'Settings',
        component: () => import('@/views/Settings.vue'),
        meta: { title: '系统设置', icon: 'Setting' },
      },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// 路由守卫
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token');
  if (!to.meta.public && !token) {
    next('/login');
  } else if (to.path === '/login' && token) {
    next('/home');
  } else {
    next();
  }
});

export default router;
