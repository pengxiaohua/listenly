'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useAuthStore } from '@/store/auth'

// 需要认证的路由
const protectedPaths = [
  '/word',
  '/sentence',
  '/my',
  '/admin',
  '/shadowing',
]

export default function AuthGuard({
  children
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isLogged = useAuthStore(state => state.isLogged)
  const isInitialized = useAuthStore(state => state.isInitialized)
  const checkAuth = useAuthStore(state => state.checkAuth)
  const setShowLoginDialog = useAuthStore(state => state.setShowLoginDialog)

  // 检查当前路径是否需要认证
  const isProtectedRoute = protectedPaths.some(path => pathname?.startsWith(path))

  useEffect(() => {
    // 只在未初始化时检查一次登录状态
    if (!isInitialized) {
      checkAuth()
    }
  }, [isInitialized, checkAuth])

  // 监听路由变化，每次进入受保护的路由时检查登录状态
  useEffect(() => {
    // 只在初始化完成后才检查登录状态
    if (isInitialized && isProtectedRoute && !isLogged) {
      setShowLoginDialog(true)
    }
  }, [pathname, isProtectedRoute, isLogged, setShowLoginDialog, isInitialized])

  // 如果不是需要认证的路由，直接显示内容
  if (!isProtectedRoute) {
    return <>{children}</>
  }

  // 如果是需要认证的路由，但还在初始化中
  if (!isInitialized) {
    return <div className='flex h-[calc(100vh-164px)] items-center justify-center text-2xl font-bold'>Loading...</div>
  }

  // 如果是需要认证的路由，但未登录
  if (!isLogged) {
    return (
      <div className='flex h-[calc(100vh-164px)] items-center justify-center text-xl font-bold'>
        <button className='bg-primary text-primary-foreground rounded-full px-4 py-2 cursor-pointer' onClick={() => setShowLoginDialog(true)}>请先登录</button>
      </div>
    )
  }

  return <>{children}</>
}
