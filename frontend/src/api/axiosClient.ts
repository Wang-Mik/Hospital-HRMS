import axios from 'axios';

const env = (import.meta as any).env || {};
const defaultBaseUrl = env.VITE_API_BASE_URL || (env.PROD ? '' : 'http://localhost:4000');

export const axiosClient = axios.create({
  baseURL: defaultBaseUrl,
  timeout: 15000,
  withCredentials: true, // Send & receive secure HttpOnly cookies across origins
  headers: {
    'Content-Type': 'application/json'
  }
});

// Auto-prefix /api if not present.
// Note: JWT is now concealed inside secure HttpOnly Cookie, managed automatically by browser.
axiosClient.interceptors.request.use((config) => {
  if (config.url && !config.url.startsWith('http')) {
    if (!config.url.startsWith('/api')) {
      const cleanPath = config.url.startsWith('/') ? config.url : `/${config.url}`;
      config.url = `/api${cleanPath}`;
    }
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

// Global response handler: Automatically kick out user on 401 Unauthorized or expired token
axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const data = error.response?.data;
    const isExpiredOrUnauthorized =
      status === 401 ||
      (status === 403 && (data?.message?.includes('hết hạn') || data?.code === 'TOKEN_EXPIRED'));

    if (isExpiredOrUnauthorized) {
      try {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        sessionStorage.clear();
      } catch {
        // ignore
      }

      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        const redirectParam = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = `/login?expired=true&redirect=${redirectParam}`;
      }
    }
    return Promise.reject(error);
  }
);

export default axiosClient;
