// app/templates/page.tsx
import { redirect } from 'next/navigation';

export default function TemplatesRootRedirect() {
  // Chuyển hướng người dùng từ /templates (đường dẫn gốc bị thiếu) 
  // đến trang thư viện mới là /store
  redirect('/store');
}