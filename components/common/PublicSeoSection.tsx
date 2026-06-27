'use client'

import { useAuthStore } from '@/store/auth'

export default function PublicSeoSection({ children }: { children: React.ReactNode }) {
  const isLogged = useAuthStore((state) => state.isLogged)

  if (isLogged) return null

  return <>{children}</>
}
