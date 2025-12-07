'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { authAPI } from '../../lib/api';
import Link from 'next/link';
// import './layout.css';  <-- BỎ DÒNG NÀY ĐI để tránh lỗi vỡ khung

interface LoginForm {
  email: string;
  password: string;
}

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>();

  const onSubmit = async (data: LoginForm) => {
    try {
      setLoading(true);
      setError('');

      const response = await authAPI.login(data);

      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify({
        id: response.id,
        username: response.username,
        email: response.email,
      }));

      // Chuyển hướng
      router.push('/placeholders');
    } catch (err: any) {
      setError(err.response?.data?.message || 'ログインに失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      {/* Khung thẻ chính: Chia đôi layout */}
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden flex w-full max-w-4xl h-[600px]">
        
        {/* --- CỘT TRÁI: ẢNH NỀN (Chiếm 50%) --- */}
        <div className="hidden md:block w-1/2 relative bg-gray-900">
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-90"
            style={{ backgroundImage: "url('/background.png')" }} 
          >
            {/* Lớp phủ mờ để chữ nổi bật nếu cần */}
            <div className="absolute inset-0 bg-black/20"></div>
          </div>
          
          {/* Logo hoặc Slogan trên ảnh */}
          <div className="absolute bottom-10 left-10 text-white z-10">
            <h2 className="text-4xl font-bold mb-2">QuickSlide</h2>
            <p className="text-gray-200">プレゼンテーションを素早く作成</p>
          </div>
        </div>

        {/* --- CỘT PHẢI: FORM ĐĂNG NHẬP (Chiếm 50%) --- */}
        <div className="w-full md:w-1/2 flex items-center justify-center p-8 md:p-12 bg-white">
          <div className="w-full max-w-md space-y-8">
            <div className="text-center md:text-left">
              <h2 className="text-2xl font-bold text-gray-900 md:hidden mb-2">QuickSlide</h2>
              <h3 className="text-xl font-semibold text-gray-700">ログイン (Đăng nhập)</h3>
              <p className="text-sm text-gray-500 mt-2">アカウント情報を入力してください</p>
            </div>

            <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
              {error && (
                <div className="rounded-md bg-red-50 p-3 border border-red-200">
                  <p className="text-sm text-red-600 text-center">{error}</p>
                </div>
              )}
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    メール (Email)
                  </label>
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
                  {errors.email && (
                    <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    パスワード (Password)
                  </label>
                  <input
                    {...register('password', {
                      required: 'パスワードを入力してください',
                    })}
                    type="password"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="••••••••"
                  />
                  {errors.password && (
                    <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
                  )}
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-all"
                >
                  {loading ? '処理中...' : 'サインイン'}
                </button>
              </div>

              <div className="text-center text-sm">
                <span className="text-gray-600">アカウントをお持ちでないですか？ </span>
                <Link href="/register" className="font-medium text-indigo-600 hover:text-indigo-500">
                  サインアップ
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}