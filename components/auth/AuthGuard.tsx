'use client'

import { useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useAuthStore } from '@/lib/auth'

export default function AuthGuard({
  children
}: {
  children: React.ReactNode
}) {
  const { isLogged, isLoading } = useAuth()
  const { setShowLoginDialog } = useAuthStore()

  useEffect(() => {
    if (!isLoading && !isLogged) {
      setShowLoginDialog(true)
    }
  }, [isLogged, isLoading, setShowLoginDialog])

  if (isLoading) {
    return <div className='flex h-screen items-center justify-center text-2xl font-bold'>Loading...</div>
  }

  if (!isLogged) {
    return null // 不显示内容，等待登录弹窗
  }

  return <>{children}</>
} 