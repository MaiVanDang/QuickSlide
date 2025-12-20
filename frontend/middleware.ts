// frontend/middleware.ts

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Định nghĩa các đường dẫn cần được bảo vệ (Main Flow)
const PROTECTED_ROUTES = [
  '/dashboard', 
  '/templates', 
  '/quick-create', 
  '/batch-generation',
  '/settings',
  '/help',
  '/editor',
  '/save-export'
];

export function middleware(request: NextRequest) {
  // Lấy token từ cookies (Cách phổ biến trong middleware)
  // Giả định: Token được lưu trong cookie tên 'quickslide_auth_token' sau khi đăng nhập
  const token = request.cookies.get('quickslide_auth_token')?.value; 
  const pathname = request.nextUrl.pathname;

  // 0. Route gốc "/" - redirect dựa trên trạng thái auth
  if (pathname === '/') {
    const url = request.nextUrl.clone();
    url.pathname = token ? '/dashboard' : '/login';
    return NextResponse.redirect(url);
  }

  // 1. Nếu cố gắng truy cập route bảo vệ mà KHÔNG CÓ token
  if (PROTECTED_ROUTES.some(route => pathname.startsWith(route))) {
    if (!token) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
  }

  // 2. Nếu ĐÃ CÓ token và cố gắng truy cập lại trang Auth (login/register)
  if (token && (pathname.startsWith('/login') || pathname.startsWith('/register'))) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// Cấu hình để áp dụng middleware cho các đường dẫn liên quan
export const config = {
  matcher: ['/', '/login', '/register', '/dashboard/:path*', '/templates/:path*', '/quick-create/:path*', '/batch-generation/:path*', '/settings', '/help', '/editor/:path*', '/save-export'],
};