import { create } from 'zustand'

interface FeatureUpdateState {
  /** 更新弹窗是否正在显示 */
  isDialogOpen: boolean
  setDialogOpen: (open: boolean) => void
}

export const useFeatureUpdateStore = create<FeatureUpdateState>((set) => ({
  isDialogOpen: false,
  setDialogOpen: (open) => set({ isDialogOpen: open }),
}))
