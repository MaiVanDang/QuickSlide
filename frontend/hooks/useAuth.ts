'use client';
import { useState, useEffect, useCallback } from 'react';
import { AuthResponse } from '@/types/api/AuthResponses';
import { loginApi, registerApi } from '@/lib/api';
import { LoginRequest, RegisterRequest } from '@/types/api/AuthRequests';
import { useRouter } from 'next/navigation';

const AUTH_TOKEN_KEY = 'quickslide_jwt_token';

interface AuthState {
  isAuthenticated: boolean;
  user: { id: number; username: string; email: string } | null;
  isLoading: boolean;
}

export const useAuth = () => {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    isLoading: true,
  });
  const router = useRouter();

  // 1. Kiểm tra Token khi khởi tạo Hook
  useEffect(() => {
    // Chỉ chạy trên client (tránh lỗi khi render phía server).
    if (typeof window === 'undefined') {
      setState(prev => ({ ...prev, isLoading: false }));
      return;
    }
    
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    // Trong môi trường thực tế: Token phải được gửi đến Server để xác thực lại
    if (token) {
      // Giả định token hợp lệ và giải mã thông tin user
      // setState({ isAuthenticated: true, user: decodeToken(token), isLoading: false });
      setState(prev => ({ ...prev, isAuthenticated: true, isLoading: false }));
    } else {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);
  
  const handleLogin = useCallback(async (data: LoginRequest) => {
    try {
      const response = await loginApi(data);
      const authData = response.data;

      // Lưu token vào localStorage/cookie (chỉ chạy trên client).
      if (typeof window !== 'undefined') {
        localStorage.setItem(AUTH_TOKEN_KEY, authData.token);
        // Cookie cho middleware (không thể đặt HttpOnly từ client)
        document.cookie = `quickslide_auth_token=${authData.token}; path=/; max-age=86400`;
      }
      
      // Cập nhật trạng thái
      setState({
        isAuthenticated: true,
        user: { id: authData.userId, username: authData.username, email: authData.email },
        isLoading: false,
      });
      router.push('/dashboard');
      return true;
      
    } catch (error) {
      return false; // Đăng nhập thất bại
    }
  }, [router]);

  const handleLogout = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      document.cookie = 'quickslide_auth_token=; path=/; max-age=0';
    }
    setState({ isAuthenticated: false, user: null, isLoading: false });
    router.push('/login');
  }, [router]);

  // Hook này sẽ được sử dụng trong MainLayout để bảo vệ routes
  return {
    ...state,
    login: handleLogin,
    logout: handleLogout,
  };
};