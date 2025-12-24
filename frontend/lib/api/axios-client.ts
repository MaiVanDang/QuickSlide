import axios from 'axios';

const getCookieValue = (name: string) => {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
};

const getAuthToken = () => {
  if (typeof window === 'undefined') return null;
  // Ưu tiên: lấy token từ localStorage để gọi API (Bearer)
  const local = localStorage.getItem('quickslide_jwt_token');
  if (local) return local;
  // Fallback: lấy token từ cookie (được dùng trong Next middleware)
  return getCookieValue('quickslide_auth_token');
};

const normalizeApiBaseUrl = (raw?: string) => {
  const base = (raw || 'http://localhost:8080').replace(/\/+$/, '');
  return base.endsWith('/api') ? base : `${base}/api`;
};

// Lấy Base URL từ biến môi trường (luôn trỏ về context-path /api)
const API_BASE_URL = normalizeApiBaseUrl(process.env.NEXT_PUBLIC_API_URL);

const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor (Bộ chặn) Request để thêm JWT Token
axiosClient.interceptors.request.use(
  (config) => {
    const token = getAuthToken();

    if (token) {
      // Đính kèm Token dưới dạng Bearer cho các API được bảo vệ
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor Response để xử lý lỗi 401/403
axiosClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      // Nếu nhận lỗi 401 UNAUTHORIZED (token hết hạn/không hợp lệ)
      console.error('ログインセッションが切れたか、トークンが無効です。');
      // Chuyển hướng người dùng về trang đăng nhập
      // window.location.href = '/login'; 
    }
    return Promise.reject(error);
  }
);

export default axiosClient;