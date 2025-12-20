import { redirect } from 'next/navigation';

// Trang root (/) sẽ chuyển hướng người dùng đến màn hình Đăng nhập
export default function HomePage() {
  redirect('/login');
}