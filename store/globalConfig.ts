'use client'

import { create } from 'zustand'

export type GlobalConfigTab = 'sound' | 'learning'

interface GlobalConfigState {
  open: boolean
  activeTab: GlobalConfigTab
}

interface GlobalConfigStore extends GlobalConfigState {
  setOpen: (open: boolean) => void
  setActiveTab: (tab: GlobalConfigTab) => void
  openDialog: (tab?: GlobalConfigTab) => void
  closeDialog: () => void
}

export const useGlobalConfigStore = create<GlobalConfigStore>((set) => ({
  open: false,
  activeTab: 'sound',
  setOpen: (open) => set({ open }),
  setActiveTab: (activeTab) => set({ activeTab }),
  openDialog: (tab) => set((state) => ({ open: true, activeTab: tab ?? state.activeTab })),
  closeDialog: () => set({ open: false }),
}))
