'use client'

import Image from 'next/image'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useIsMobile } from '@/lib/useIsMobile'

interface WordModeSelectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectSpelling: () => void
  onSelectDictation: () => void
}

export default function WordModeSelectDialog({
  open,
  onOpenChange,
  onSelectSpelling,
  onSelectDictation,
}: WordModeSelectDialogProps) {
  const isMobile = useIsMobile()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="md:max-w-lg px-4 py-5 md:px-6 md:py-6">
        <DialogHeader>
          <DialogTitle className="text-center">选择学习模式</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 md:gap-4 mt-2">
          {/* 播报听写模式 */}
          <button
            onClick={() => {
              onOpenChange(false)
              onSelectDictation()
            }}
            className="flex flex-col items-center gap-2 md:gap-3 p-3 md:p-4 border-2 border-slate-200 dark:border-slate-700 rounded-xl hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 transition-colors cursor-pointer group"
          >
            <div className="w-full mx-auto aspect-square relative rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800">
              <Image
                src="/images/words/dictation-mode.png"
                alt="播报听写模式"
                fill
                className="object-cover"
              />
            </div>
            <div className="text-sm md:text-base font-medium group-hover:text-indigo-600">播报听写模式</div>
            <div className="text-xs text-slate-500 text-center leading-relaxed">
              按顺序播放单词发音，在纸上听写
            </div>
          </button>

          {/* 在线拼写模式 */}
          <button
            onClick={() => {
              onOpenChange(false)
              onSelectSpelling()
            }}
            className="flex flex-col items-center gap-2 md:gap-3 p-3 md:p-4 border-2 border-slate-200 dark:border-slate-700 rounded-xl hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 transition-colors cursor-pointer group"
          >
            <div className="w-full mx-auto aspect-square relative rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800">
              <Image
                src="/images/words/spelling-mode.png"
                alt="在线拼写模式"
                fill
                className="object-cover"
              />
            </div>
            <div className="text-sm md:text-base font-medium group-hover:text-indigo-600">在线拼写模式</div>
            <div className="text-xs text-slate-500 text-center leading-relaxed">
              在线输入拼写，即时校验对错
            </div>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
