'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { UserPlus, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';

const RegisterSchema = z.object({
  username: z.string().min(6, 'Tên người dùng phải có ít nhất 6 ký tự'),
  email: z.string().email('Vui lòng nhập địa chỉ email hợp lệ'),
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
  confirmPassword: z.string().min(1, 'Vui lòng nhập lại mật khẩu'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Mật khẩu không trùng khớp',
  path: ['confirmPassword'],
});

type RegisterRequest = z.infer<typeof RegisterSchema>;

export function RegisterForm() {
  const router = useRouter();
  const form = useForm<RegisterRequest>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: { username: '', email: '', password: '', confirmPassword: '' },
    mode: 'onTouched',
  });

  const { isSubmitting, isValid } = form.formState;

  const onSubmit = async (data: RegisterRequest) => {
    try {
      // API Output gửi sang /api/register
      // Gửi dữ liệu (username, email, password, confirmPassword)
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        // Giả sử server trả về lỗi trùng lặp username
        const errorMessage = errorData.message || 'Đăng ký thất bại. Tên người dùng hoặc email đã tồn tại.';
        form.setError('root.serverError', { message: errorMessage });
        return;
      }

      // Luồng thành công: Chuyển đến Màn hình Đăng nhập (No. 1)
      router.push('/login'); 
    } catch (error) {
      form.setError('root.serverError', { message: 'Lỗi kết nối' });
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <h2 className="text-3xl text-gray-900 mb-2">Đăng Ký</h2>
        <p className="text-gray-600">Tạo tài khoản mới</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Tên người dùng */}
          <FormField
            control={form.control} name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tên người dùng</FormLabel>
                <FormControl><Input placeholder="Tên người dùng" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {/* Email */}
          <FormField
            control={form.control} name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Địa Chỉ Email</FormLabel>
                <FormControl><Input placeholder="Địa chỉ email" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Mật khẩu */}
          <FormField
            control={form.control} name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mật Khẩu (Tối thiểu 6 ký tự)</FormLabel>
                <FormControl><Input type="password" placeholder="Mật khẩu" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Xác nhận Mật khẩu */}
          <FormField
            control={form.control} name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Xác Nhận Mật Khẩu</FormLabel>
                <FormControl><Input type="password" placeholder="Nhập lại mật khẩu" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {form.formState.errors.root?.serverError && (
              <p className="text-sm text-red-600 text-center">
                  {form.formState.errors.root.serverError.message}
              </p>
          )}

          {/* ④ Nút Đăng ký (Disabled khi chưa hợp lệ) */}
          <Button
            type="submit"
            className="w-full bg-blue-600 disabled:bg-blue-300"
            disabled={!isValid || isSubmitting}
          >
            {isSubmitting ? 'Đang xử lý...' : (
                <>
                  <UserPlus className="w-5 h-5 mr-2" />
                  Đăng Ký
                </>
            )}
          </Button>
        </form>
      </Form>
      
      {/* ⑤ Link Quay lại */}
      <div className="mt-6">
        <a 
          onClick={() => router.push('/login')}
          className="text-blue-600 hover:text-blue-700 flex items-center gap-2 mx-auto cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          ログイン画面に戻る
        </a>
      </div>
    </div>
  );
}