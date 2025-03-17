'use client'

import { useState, useEffect } from 'react'
import Cookies from 'js-cookie'

export function useAuth() {
  const [isLogged, setIsLogged] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkAuth = () => {
      const userId = Cookies.get('userId')
      setIsLogged(!!userId)
      setIsLoading(false)
    }

    checkAuth()

    // 监听存储变化
    const handleStorageChange = () => {
      checkAuth()
    }

    window.addEventListener('storage', handleStorageChange)
    return () => {
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [])

  const login = (userId: string) => {
    Cookies.set('userId', userId, { expires: 30 }) // 30天过期
    setIsLogged(true)
  }

  const logout = () => {
    Cookies.remove('userId')
    setIsLogged(false)
  }

  return {
    isLogged,
    isLoading,
    login,
    logout
  }
}
