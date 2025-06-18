import { create } from 'zustand'
import Cookies from 'js-cookie'

interface AuthState {
  userId: string | null
  isLogged: boolean
  showLoginDialog: boolean
  isInitialized: boolean
}

interface AuthStore extends AuthState {
  setUserId: (userId: string | null) => void
  setIsLogged: (isLogged: boolean) => void
  setShowLoginDialog: (show: boolean) => void
  login: (userId: string) => void
  logout: () => void
  checkAuth: () => Promise<void>
  setInitialized: (initialized: boolean) => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  userId: Cookies.get('userId') || null,
  isLogged: false,
  showLoginDialog: false,
  isInitialized: false,
  setUserId: (userId) => set({ userId }),
  setIsLogged: (isLogged) => set({ isLogged }),
  setShowLoginDialog: (show) => set({ showLoginDialog: show }),
  setInitialized: (initialized) => set({ isInitialized: initialized }),
  login: (userId) => {
    Cookies.set('userId', userId, { expires: 30 }) // 30天过期
    set({ userId, isLogged: true })
  },
  logout: async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      set({ userId: null, isLogged: false })
    } catch (error) {
      console.error('登出失败:', error)
    }
  },
  checkAuth: async () => {
    try {
      const res = await fetch('/api/auth/check')
      set({ isLogged: res.ok, isInitialized: true })
    } catch {
      set({ isLogged: false, isInitialized: true })
    }
  }
}))
