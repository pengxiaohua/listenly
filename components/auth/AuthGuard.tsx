'use client'

import { useEffect, useState } from 'react'
import { checkAuth, requireAuth } from '@/lib/auth'

export default function AuthGuard({
  children
}: {
  children: React.ReactNode
}) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      try {
        const auth = await checkAuth()
        if (!auth) {
          requireAuth()
        }
        setIsAuthenticated(auth)
      } finally {
        setIsLoading(false)
      }
    }
    init()
  }, [])

  if (isLoading) {
    return <div>Loading...</div>
  }

  if (!isAuthenticated) {
    return null // 不显示内容，等待登录弹窗
  }

  return <>{children}</>
} 