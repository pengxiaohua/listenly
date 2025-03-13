import { create } from 'zustand'

interface AuthStore {
  showLoginDialog: boolean
  setShowLoginDialog: (show: boolean) => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  showLoginDialog: false,
  setShowLoginDialog: (show) => set({ showLoginDialog: show }),
}))

export async function checkAuth() {
  try {
    const res = await fetch('/api/auth/check')
    return res.ok
  } catch {
    return false
  }
}

export function requireAuth() {
  const { setShowLoginDialog } = useAuthStore.getState()
  setShowLoginDialog(true)
} 