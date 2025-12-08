'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Không kiểm tra token gì cả
    // Cứ vào trang chủ là chuyển hướng ngay sang Login
    router.push('/login');
  }, [router]);

  // Giao diện chờ trong lúc đang chuyển hướng
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4 text-blue-600">QuickSlide</h1>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-gray-500 mt-2">Đang chuyển hướng đến đăng nhập...</p>
      </div>
    </div>
  );
}