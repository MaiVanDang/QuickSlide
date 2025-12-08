'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { authAPI } from '../../lib/api';
import Link from 'next/link';
// Đã xóa import './layout.css' để tránh vỡ giao diện

interface RegisterForm {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterForm>();

  const password = watch('password');

  const onSubmit = async (data: RegisterForm) => {
    try {
      setLoading(true);
      setError('');

      const response = await authAPI.register(data);

      // Lưu token vào localStorage
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify({
        id: response.id,
        username: response.username,
        email: response.email,
      }));

      // Chuyển hướng
      router.push('/login'); // Hoặc '/placeholders' tùy luồng của bạn
    } catch (err: any) {
      setError(err.response?.data?.message || '登録に失敗しました。もう一度お試しください。');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      {/* Khung thẻ chính: Chia đôi layout */}
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden flex w-full max-w-4xl">

        {/* --- CỘT TRÁI: ẢNH NỀN (Chiếm 50%) --- */}
        <div className="hidden md:block w-1/2 relative bg-gray-900">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-90"
            style={{ backgroundImage: "url('/background.png')" }}
          >
            <div className="absolute inset-0 bg-black/20"></div>
          </div>

          <div className="absolute bottom-10 left-10 text-white z-10">
            <h2 className="text-4xl font-bold mb-2">QuickSlide</h2>
            <p className="text-gray-200">無料でアカウントを作成</p>
          </div>
        </div>

        {/* --- CỘT PHẢI: FORM ĐĂNG KÝ (Chiếm 50%) --- */}
        <div className="w-full md:w-1/2 flex items-center justify-center p-8 md:p-12 bg-white">
          <div className="w-full max-w-md space-y-6">
            <div className="text-center md:text-left">
              <h2 className="text-2xl font-bold text-gray-900 md:hidden mb-2">QuickSlide</h2>
              <h3 className="text-xl font-semibold text-gray-700">サインアップ (Đăng ký)</h3>
              <p className="text-sm text-gray-500 mt-1">新しいアカウントを作成します</p>
            </div>

            <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)}>
              {error && (
                <div className="rounded-md bg-red-50 p-3 border border-red-200">
                  <p className="text-sm text-red-600 text-center">{error}</p>
                </div>
              )}

              {/* Tên đăng nhập */}
              <div>
                <label className="block text-sm font-medium text-gray-700">ユーザー名</label>
                <input
                  {...register('username', {
                    required: 'ユーザー名を入力してください',
                    minLength: { value: 3, message: '3文字以上で入力してください' },
                  })}
                  type="text"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="johndoe"
                />
                {errors.username && <p className="mt-1 text-xs text-red-600">{errors.username.message}</p>}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700">メール</label>
                <input
                  {...register('email', {
                    required: 'メールアドレスを入力してください',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'メールアドレスの形式が正しくありません',
                    },
                  })}
                  type="email"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="you@example.com"
                />
                {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
              </div>

              {/* Mật khẩu */}
              <div>
                <label className="block text-sm font-medium text-gray-700">パスワード</label>
                <input
                  {...register('password', {
                    required: 'パスワードを入力してください',
                    minLength: { value: 6, message: '6文字以上で入力してください' },
                  })}
                  type="password"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="••••••••"
                />
                {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
              </div>

              {/* Xác nhận mật khẩu */}
              <div>
                <label className="block text-sm font-medium text-gray-700">パスワードの確認</label>
                <input
                  {...register('confirmPassword', {
                    required: 'パスワードを確認してください',
                    validate: (value) => value === password || 'パスワードが一致しません',
                  })}
                  type="password"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="••••••••"
                />
                {errors.confirmPassword && <p className="mt-1 text-xs text-red-600">{errors.confirmPassword.message}</p>}
              </div>

              {/* Nút Submit */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-all"
                >
                  {loading ? '作成中...' : 'サインアップ'}
                </button>
              </div>

              <div className="text-center text-sm">
                <span className="text-gray-600">すでにアカウントをお持ちですか？ </span>
                <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
                  ログイン
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}