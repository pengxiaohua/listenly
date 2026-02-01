'use client'

import { Toaster } from 'sonner'
import Header from "@/components/common/Header";
import GlobalConfigFloat from '@/components/common/GlobalConfigFloat'
import AuthProvider from '@/components/auth/AuthProvider'
import AuthGuard from '@/components/auth/AuthGuard'
import { ThemeProvider } from "@/components/common/ThemeProvider";
import { usePathname } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { useUserConfigStore } from '@/store/userConfig'
import { useEffect } from 'react'
import { usePageTitle } from '@/lib/usePageTitle'
import GlobalLoading from '@/components/common/GlobalLoading'

export function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogged = useAuthStore(state => state.isLogged);
  const fetchConfig = useUserConfigStore(state => state.fetchConfig);

  // 使用自定义 Hook 设置页面标题 (客户端兜底)
  usePageTitle();

  // 在首页且未登录时不显示Header
  const shouldShowHeader = pathname !== '/' || isLogged;

  useEffect(() => {
    if (isLogged) {
      fetchConfig()
    }
  }, [isLogged, fetchConfig])

  return (
    <ThemeProvider>
      {/* Toaster需要再root app下引入，才能全局使用 */}
      <Toaster position="top-center" duration={1000} />
      {shouldShowHeader && <Header />}
      <main className="flex-grow">
        <AuthGuard>
          {children}
        </AuthGuard>
      </main>
      <GlobalLoading />
      {/* <Footer /> */}
      {isLogged && <GlobalConfigFloat />}
      <AuthProvider />
    </ThemeProvider>
  );
}
