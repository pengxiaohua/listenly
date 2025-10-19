'use client'

import { create } from 'zustand'

interface GlobalLoadingState {
  visible: boolean
  message?: string
}

interface GlobalLoadingStore extends GlobalLoadingState {
  open: (message?: string) => void
  close: () => void
  setMessage: (message?: string) => void
}

export const useGlobalLoadingStore = create<GlobalLoadingStore>((set) => ({
  visible: false,
  message: undefined,
  open: (message) => set({ visible: true, message }),
  close: () => set({ visible: false, message: undefined }),
  setMessage: (message) => set({ message })
}))


