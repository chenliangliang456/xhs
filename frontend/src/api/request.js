import axios from 'axios';
import { ElMessage } from 'element-plus';
import router from '@/router';
import { apiBaseUrl } from '@/utils/assetUrl';

const request = axios.create({
  baseURL: apiBaseUrl(),
  timeout: 120000,
});

// 请求拦截 - 附加 Token
request.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 响应拦截 - 统一错误处理
request.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error.response?.data?.message || error.message || '请求失败';

    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      router.push('/login');
      ElMessage.error('登录已过期，请重新登录');
    } else {
      ElMessage.error(message);
    }

    return Promise.reject(error);
  }
);

export default request;
