'use client'

import { Toaster } from 'sonner'
import { Geist, Geist_Mono } from "next/font/google";
import Header from "@/components/common/Header";
import { FeedbackDialog } from "@/components/common/FeedbackDialog";
import AuthProvider from '@/components/auth/AuthProvider'
import AuthGuard from '@/components/auth/AuthGuard'
// import Footer from '@/components/common/Footer'
import { ThemeProvider } from "@/components/common/ThemeProvider";
import { usePathname } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { usePageTitle } from '@/lib/usePageTitle'
import GlobalLoading from '@/components/common/GlobalLoading'

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogged = useAuthStore(state => state.isLogged);

  // 使用自定义 Hook 设置页面标题
  usePageTitle();

  // 在首页且未登录时不显示Header
  const shouldShowHeader = pathname !== '/' || isLogged;

  return (
    <>
      <ThemeProvider>
        {/* Toaster需要再root app下引入，才能全局使用 */}
        <Toaster position="top-center" />
        {shouldShowHeader && <Header />}
        <main className="flex-grow">
          <AuthGuard>
            {children}
          </AuthGuard>
        </main>
        <GlobalLoading />
        {/* <Footer /> */}
        <div className="relative max-w-4xl mx-auto">
          {/* 右下角反馈按钮 */}
          <div className="fixed bottom-6 right-6">
            {isLogged && <FeedbackDialog />}
          </div>
        </div>
        <AuthProvider />
      </ThemeProvider>
    </>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
      >
        <LayoutContent>
          {children}
        </LayoutContent>
      </body>
    </html>
  );
}
