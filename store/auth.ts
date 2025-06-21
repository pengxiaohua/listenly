import { create } from 'zustand'

interface UserInfo {
  userName: string
  avatar: string
}

interface AuthState {
  userId: string | null
  isLogged: boolean
  showLoginDialog: boolean
  isInitialized: boolean
  userInfo: UserInfo | null
}

interface AuthStore extends AuthState {
  setUserId: (userId: string | null) => void
  setIsLogged: (isLogged: boolean) => void
  setShowLoginDialog: (show: boolean) => void
  login: (userId: string) => void
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
  setInitialized: (initialized: boolean) => void
  fetchUserInfo: () => Promise<void>
  setUserInfo: (userInfo: UserInfo | null) => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  userId: null,
  isLogged: false,
  showLoginDialog: false,
  isInitialized: false,
  userInfo: null,
  setUserId: (userId) => set({ userId }),
  setIsLogged: (isLogged) => set({ isLogged }),
  setShowLoginDialog: (show) => set({ showLoginDialog: show }),
  setInitialized: (initialized) => set({ isInitialized: initialized }),
  setUserInfo: (userInfo) => set({ userInfo }),
  login: async (userId) => {
    set({ userId, isLogged: true })
    // 登录后自动获取用户信息
    const store = useAuthStore.getState()
    await store.fetchUserInfo()
  },
  logout: async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      set({ userId: null, isLogged: false, userInfo: null })
    } catch (error) {
      console.error('登出失败:', error)
    }
  },
  checkAuth: async () => {
    try {
      const res = await fetch('/api/auth/check')
      const isLogged = res.ok
      set({ isLogged, isInitialized: true })
      if (isLogged) {
        const store = useAuthStore.getState()
        await store.fetchUserInfo()
      }
    } catch {
      set({ isLogged: false, isInitialized: true })
    }
  },
  fetchUserInfo: async () => {
    try {
      const res = await fetch('/api/auth/user')
      if (res.ok) {
        const userInfo = await res.json()
        set({ userInfo })
      }
    } catch (error) {
      console.error('获取用户信息失败:', error)
    }
  }
}))
