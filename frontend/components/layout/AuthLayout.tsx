// frontend/app/(main)/layout.tsx
import * as React from 'react';
import { Header } from '@/components/layout/Header';
// import { useAuth } from '@/hooks/useAuth'; 
// import { redirect } from 'next/navigation';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  // Logic kiểm tra xác thực (Giả định)
  // const { isAuthenticated, isLoading } = useAuth();
  
  // if (isLoading) {
  //   return <div>Loading...</div>; // Hoặc Skeleton Loader
  // }

  // if (!isAuthenticated) {
  //   redirect('/login');
  // }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-7xl mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  );
}