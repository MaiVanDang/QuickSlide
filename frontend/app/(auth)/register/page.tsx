
import { RegisterForm } from '@/components/auth/RegisterForm';
import { ThemeVisual } from '@/components/common/ThemeVisual';

// Màn hình Đăng ký (No. 2)
export default function RegisterPage() {
  return (
    <div className="min-h-screen flex">
      {/* Cột Trái: Vui vẻ, sinh động, học tiếng Nhật */}
      <ThemeVisual 
        title="QuickSlide"
        subtitle="学習用スライドを簡単に作成"
        quote="新しいアカウントで今すぐ始めましょう！"
        emoji={['📚', '✨', '🎓', '🌟']} // Emoji khác để thay đổi
      />

      {/* Cột Phải: Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <RegisterForm />
      </div>
    </div>
  );
}