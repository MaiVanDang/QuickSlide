'use client';

import Link from 'next/link';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function Header() {
  // Logic hiển thị username, logout (nếu có)

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-white">
      <div className="flex h-16 items-center px-4 md:px-6 justify-between">
        
        {/* Logo và Điều hướng */}
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="text-xl font-bold text-blue-600">
            QuickSlide
          </Link>
          <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
            <Link href="/dashboard" className="hover:text-blue-600 transition-colors">
              Home
            </Link>
            <Link href="/templates" className="hover:text-blue-600 transition-colors">
              Templates
            </Link>
          </nav>
        </div>

        {/* Thanh tìm kiếm */}
        <div className="flex-1 max-w-lg mx-8">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                    type="search"
                    placeholder="Search templates, projects, or keywords..."
                    className="w-full pl-10"
                />
            </div>
        </div>

        {/* Nút hành động và User */}
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={() => {/* Logout logic */}}>
            Log out
          </Button>
          <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center font-semibold">
            A
          </div>
        </div>
      </div>
    </header>
  );
}