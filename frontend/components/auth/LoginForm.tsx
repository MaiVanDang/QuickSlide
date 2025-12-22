'use client';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { LogIn } from 'lucide-react';
import { useRouter } from 'next/navigation'; // Sử dụng Next Router
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import { AuthResponse } from '@/types/api/AuthResponses';

// Định nghĩa Schema validation dựa trên luật nghiệp vụ (Bắt buộc nhập)
const LoginSchema = z.object({
  usernameOrEmail: z.string().min(1, 'ユーザー名またはメールアドレスを入力してください'),
  password: z.string().min(1, 'パスワードを入力してください'),
});

type LoginRequest = z.infer<typeof LoginSchema>;

export function LoginForm() {
  const router = useRouter();
  const form = useForm<LoginRequest>({
    resolver: zodResolver(LoginSchema),
    defaultValues: { usernameOrEmail: '', password: '' },
    mode: 'onTouched', // Báo lỗi khi người dùng rời khỏi ô nhập liệu
  });

  const { isSubmitting, isValid } = form.formState;

  const onSubmit = async (data: LoginRequest) => {
    try {
      // 1. Gửi yêu cầu tới API: POST /api/login
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        // Xử lý lỗi đăng nhập thất bại
        const errorData = await response.json();
        const errorMessage = errorData.message || 'ユーザー名またはパスワードが間違っています';
        form.setError('root.serverError', { message: errorMessage });
        return;
      }

      // 2. Lưu token vào localStorage + cookie để middleware nhận diện
      const authData: AuthResponse = await response.json();
      // Bearer token cho các request API trên client
      localStorage.setItem('quickslide_jwt_token', authData.token);
      // Cookie cho middleware (không thể đặt HttpOnly từ client)
      document.cookie = `quickslide_auth_token=${authData.token}; path=/; max-age=86400`;

      router.push('/dashboard');
    } catch (error) {
      form.setError('root.serverError', { message: 'ネットワークエラーが発生しました' });
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <h2 className="text-3xl text-gray-900 mb-2">ログイン</h2>
        <p className="text-gray-600">アカウントにログインしてください</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Tên người dùng/Email */}
          <FormField
            control={form.control} name="usernameOrEmail"
            render={({ field }) => (
              <FormItem>
                <FormLabel>ユーザー名またはメールアドレス</FormLabel>
                <FormControl><Input placeholder="メールアドレスまたはユーザー名" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Mật khẩu */}
          <FormField
            control={form.control} name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>パスワード</FormLabel>
                <FormControl><Input type="password" placeholder="パスワード" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {form.formState.errors.root?.serverError && (
            <p className="text-sm text-red-600 text-center">
              {form.formState.errors.root.serverError.message}
            </p>
          )}

          <div className="flex items-center justify-between">
            {/* Link Quên mật khẩu */}
            <a href="/auth/forgot-password" className="text-sm text-blue-600 hover:text-blue-700">
              パスワードをお忘れですか？
            </a>
          </div>

          {/* Nút Đăng nhập - Luật AC3: Disabled cho đến khi cả hai trường có dữ liệu */}
          <Button
            type="submit"
            className="w-full bg-blue-600 disabled:bg-blue-300"
            disabled={!isValid || isSubmitting}
          >
            {isSubmitting ? '処理中...' : (
              <>
                <LogIn className="w-5 h-5 mr-2" />
                サインイン
              </>
            )}
          </Button>
        </form>
      </Form>

      {/* Link Đăng ký */}
      <div className="mt-6 text-center">
        <p className="text-gray-600">
          アカウントをお持ちでないですか？{' '}
          <a href="/register" className="text-blue-600 hover:text-blue-700">
            登録
          </a>
        </p>
      </div>
    </div>
  );
}