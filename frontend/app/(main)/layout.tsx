'use client';

import * as React from 'react';
import { Header } from '@/components/layout/Header';

export default function MainLayout({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="w-full px-4 sm:px-6 md:px-8 lg:px-12 py-8">
        {children}
      </main>
    </div>
  );
}