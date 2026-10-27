import axios from 'axios';

const env = (import.meta as any).env || {};
const defaultBaseUrl = env.VITE_API_BASE_URL || (env.PROD ? '' : 'http://localhost:4000');

export const axiosClient = axios.create({
  baseURL: defaultBaseUrl,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Auto-prefix /api if not present and attach JWT token
axiosClient.interceptors.request.use((config) => {
  if (config.url && !config.url.startsWith('http')) {
    if (!config.url.startsWith('/api')) {
      const cleanPath = config.url.startsWith('/') ? config.url : `/${config.url}`;
      config.url = `/api${cleanPath}`;
    }
  }

  const token = localStorage.getItem('token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// In local development, simulate ~600ms database latency to mirror real-world 1-second cloud deployment
if (env.DEV) {
  axiosClient.interceptors.response.use(async (response) => {
    if (response.config.method?.toLowerCase() === 'get') {
      await new Promise((resolve) => setTimeout(resolve, 600));
    }
    return response;
  });
}

// Global response handler: Clear token on 401 Unauthorized
axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default axiosClient;
