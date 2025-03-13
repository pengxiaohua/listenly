'use client'

import { useAuthStore } from '@/lib/auth'
import LoginDialog from './LoginDialog'

export default function AuthProvider() {
  const { showLoginDialog, setShowLoginDialog } = useAuthStore()

  return (
    <LoginDialog 
      open={showLoginDialog} 
      onOpenChange={setShowLoginDialog}
    />
  )
} 