
import { ThemeVisual } from '@/components/common/ThemeVisual';
import { LoginForm } from '@/components/auth/LoginForm';

// Màn hình Đăng nhập (No. 1)
export default function LoginPage() {
  return (
    <div className="min-h-screen flex">
      {/* Cột Trái: Vui vẻ, sinh động, học tiếng Nhật */}
      <ThemeVisual 
        title="QuickSlide"
        subtitle="学習用スライドを簡単に作成"
        quote="楽しく、速く、簡単にプレゼンテーションを作成"
        emoji={['あ', 'ア', '漢', '🎌']}
      />

      {/* Cột Phải: Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <LoginForm />
      </div>
    </div>
  );
}