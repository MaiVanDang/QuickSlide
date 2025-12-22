import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AuthProvider } from "@/hooks/useAuthContext"; // Giả định bạn sử dụng Context cho Auth
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "QuickSlide - 学習スライドを作成",
  description: "プレゼンテーションを簡単、迅速、シンプルに作成します",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        {/* AuthProvider sẽ cung cấp trạng thái xác thực cho toàn bộ ứng dụng */}
        <AuthProvider>
          {children}
          <Toaster richColors position="top-right" />
        </AuthProvider>
      </body>
    </html>
  );
}