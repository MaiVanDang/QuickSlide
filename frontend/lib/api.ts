import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: Đính kèm JWT Token
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor: Xử lý 401 Unauthorized (Token hết hạn)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (typeof window !== 'undefined' && error.response?.status === 401) {
      localStorage.removeItem('token');
      // Chuyển hướng đến trang đăng nhập khi token hết hạn
      window.location.href = '/login'; 
    }
    return Promise.reject(error);
  }
);

// ============================================================
// AUTH APIs
// ============================================================
export const authAPI = {
  register: async (data: any) => {
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  login: async (data: { email: string; password: string }) => {
    const response = await api.post('/auth/login', data);
    return response.data;
  },

  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

export const templateAPI = {
    getAllTemplates: async () => {
        const response = await api.get('/templates');
        return response.data;
    },
    getTemplateById: async (id: string | number) => {
        const response = await api.get(`/templates/${id}`);
        return response.data;
    },
    createTemplate: async (data: any) => {
        const response = await api.post('/templates', data);
        return response.data;
    },
    updateTemplate: async (id: string | number, data: any) => {
        const response = await api.put(`/templates/${id}`, data);
        return response.data;
    },
    deleteTemplate: async (id: string | number) => {
        const response = await api.delete(`/templates/${id}`);
        return response.data;
    },

    // ⭐️ THÊM MỚI: API cho dashboard
    getRecentTemplates: async () => {
        const response = await api.get('/templates/recent');
        return response.data;
    },
};


// ============================================================
// PLACEHOLDER APIs
// ============================================================
export const placeholderAPI = {
  getBySlide: async (slideId: number) => {
    const response = await api.get(`/placeholders/slide/${slideId}`);
    return response.data;
  },
  save: async (data: any) => {
    const response = await api.post('/placeholders/save', data);
    return response.data;
  },
};

// Export default cho axios instance
export default api;