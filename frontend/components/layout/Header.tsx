// components/layout/Header.tsx

'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { Home as HomeIcon, Layout, Search, Settings, HelpCircle, LogOut } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Định nghĩa Interface cho props của NavItem
interface NavItemProps {
  href: string; // Đường dẫn
  icon: React.ElementType; // Component Icon (ví dụ: Lucide Icon)
  label: string; // Nhãn hiển thị
}

// Giả định dùng hook này để quản lý trạng thái đăng nhập
// import { useAuth } from '@/hooks/useAuth';

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = React.useState('');
  // const { logout } = useAuth(); // Giả định hook logout

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('quickslide_jwt_token');
      document.cookie = 'quickslide_auth_token=; path=/; max-age=0';
      router.push('/login');
    }
  };

  // SỬA LỖI: Áp dụng Interface NavItemProps
  const NavItem = ({ href, icon: Icon, label }: NavItemProps) => {
    const isActive = pathname === href;
  const activeClasses = isActive ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-blue-600';
    return (
      <button 
        onClick={() => router.push(href)}
  className={`flex items-center gap-0 pb-0.5 transition-colors ${activeClasses}`}
      >
    <Icon className="w-4 h-4" />
      <span className="ml-[1px]">{label}</span>
      </button>
    );
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="w-full px-4 sm:px-6 md:px-8 lg:px-12 py-4 md:py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4 min-w-[220px]">
            <h1 className="text-xl sm:text-2xl font-semibold text-blue-600 cursor-default">QuickSlide</h1>
            <nav className="flex gap-4 text-base sm:text-lg">
              <NavItem href="/dashboard" icon={HomeIcon} label="Trang Chủ" />
              <NavItem href="/templates" icon={Layout} label="Mẫu" />
            </nav>
          </div>

          <div className="flex items-center gap-2 flex-1 min-w-[260px] justify-end">
            <div className="relative w-full max-w-[260px]">
              <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm"
                className="pl-8 pr-3 py-2 border border-gray-200 rounded-lg focus:ring-blue-500 w-full text-sm"
              />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger className="p-2 hover:bg-gray-100 rounded-md inline-flex items-center justify-center">
                <Settings className="w-5 h-5 text-gray-600" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => router.push('/settings')}>
                  <Settings className="w-4 h-4 mr-2" />
                  Cài Đặt
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/help')}>
                  <HelpCircle className="w-4 h-4 mr-2" />
                  Trợ Giúp
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600 hover:!bg-red-50">
                  <LogOut className="w-4 h-4 mr-2" />
                  Đăng Xuất
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
