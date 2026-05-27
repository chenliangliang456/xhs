import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { authApi } from '@/api';

export const useUserStore = defineStore('user', () => {
  const token = ref(localStorage.getItem('token') || '');
  const username = ref('');

  const isLoggedIn = computed(() => !!token.value);

  async function login(credentials) {
    const res = await authApi.login(credentials);
    token.value = res.data.token;
    username.value = res.data.username;
    localStorage.setItem('token', res.data.token);
    return res;
  }

  function logout() {
    token.value = '';
    username.value = '';
    localStorage.removeItem('token');
  }

  async function fetchProfile() {
    if (!token.value) return;
    const res = await authApi.getProfile();
    username.value = res.data.username;
  }

  return { token, username, isLoggedIn, login, logout, fetchProfile };
});
