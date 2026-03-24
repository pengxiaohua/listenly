'use client'

import { useRouter } from 'next/navigation'
import * as AlertDialog from '@radix-ui/react-alert-dialog'
import { Crown } from 'lucide-react'

interface VipGateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description?: string
}

export default function VipGateDialog({
  open,
  onOpenChange,
  title = '会员专属内容',
  description = '该课程为会员专属课程，开通会员后即可学习。',
}: VipGateDialogProps) {
  const router = useRouter()

  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 bg-black/40 z-50" />
        <AlertDialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-sm rounded-lg bg-white dark:bg-slate-900 p-6 shadow-xl border border-slate-200 dark:border-slate-800 z-50">
          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mb-3">
              <Crown className="w-6 h-6 text-orange-500" />
            </div>
            <AlertDialog.Title className="text-lg font-semibold">
              {title}
            </AlertDialog.Title>
            <AlertDialog.Description className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              {description}
            </AlertDialog.Description>
          </div>
          <div className="mt-5 flex gap-3">
            <AlertDialog.Cancel asChild>
              <button
                className="flex-1 px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                取消
              </button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <button
                onClick={() => {
                  onOpenChange(false)
                  router.push('/vip')
                }}
                className="flex-1 px-3 py-2 rounded-md bg-orange-500 text-white text-sm hover:bg-orange-600 cursor-pointer"
              >
                开通会员
              </button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}
