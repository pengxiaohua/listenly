'use client'

import { Toaster } from 'sonner'
import Header from "@/components/common/Header";
import BottomNav from "@/components/common/BottomNav";
import MobileTrialBanner from "@/components/common/MobileTrialBanner";
import GlobalConfigFloat from '@/components/common/GlobalConfigFloat'
import AuthProvider from '@/components/auth/AuthProvider'
import AuthGuard from '@/components/auth/AuthGuard'
import InviteCapture from '@/components/auth/InviteCapture'
import { ThemeProvider } from "@/components/common/ThemeProvider";
import { useAuthStore } from '@/store/auth'
import { useUserConfigStore } from '@/store/userConfig'
import { Suspense, useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { usePageTitle } from '@/lib/usePageTitle'
import GlobalLoading from '@/components/common/GlobalLoading'
import FeatureUpdateDialog from '@/components/common/FeatureUpdateDialog'

function ConditionalHeader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // 视频详情页不显示 Header
  const isVideoDetail = /^\/video\/[^/]+$/.test(pathname);
  // 单词拼写/句子听写/影子跟读详情页（带 set 和 group 参数时）不显示 Header
  const isStudyDetail = /^\/(word|sentence|shadowing)$/.test(pathname)
    && searchParams.has('set') && searchParams.has('group');

  if (isVideoDetail || isStudyDetail) return null;
  return <Header />;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const isLogged = useAuthStore(state => state.isLogged);
  const fetchConfig = useUserConfigStore(state => state.fetchConfig);

  // 使用自定义 Hook 设置页面标题 (客户端兜底)
  usePageTitle();

  useEffect(() => {
    if (isLogged) {
      fetchConfig()
    }
  }, [isLogged, fetchConfig])

  return (
    <ThemeProvider>
      {/* Toaster需要再root app下引入，才能全局使用 */}
      <Toaster position="top-center" duration={1000} />
      <MobileTrialBanner />
      <Suspense fallback={null}>
        <ConditionalHeader />
      </Suspense>
      <main className="flex-grow">
        <AuthGuard>
          {children}
        </AuthGuard>
      </main>
      <Suspense fallback={null}>
        <BottomNav />
      </Suspense>
      <GlobalLoading />
      {/* <Footer /> */}
      <GlobalConfigFloat />
      <AuthProvider />
      <InviteCapture />
      <FeatureUpdateDialog />
    </ThemeProvider>
  );
}
