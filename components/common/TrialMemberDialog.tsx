'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import * as AlertDialog from '@radix-ui/react-alert-dialog'
import { Crown, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/store/auth'

interface TrialMemberDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function TrialMemberDialog({ open, onOpenChange }: TrialMemberDialogProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [rejected, setRejected] = useState(false)
  const fetchUserInfo = useAuthStore(state => state.fetchUserInfo)

  const handleActivate = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/pay/trial', { method: 'POST' })
      if (res.status === 409) {
        // 已享受过会员
        setRejected(true)
        return
      }
      if (!res.ok) {
        toast.error('激活失败，请稍后重试')
        return
      }
      toast.success('试用会员激活成功，享受 3 天会员体验')
      onOpenChange(false)
      await fetchUserInfo()
    } catch {
      toast.error('网络错误，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    onOpenChange(false)
    setRejected(false)
  }

  return (
    <AlertDialog.Root open={open} onOpenChange={(v) => { if (!v) handleClose(); else onOpenChange(v) }}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 bg-black/40 z-50" />
        <AlertDialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-sm rounded-lg bg-white dark:bg-slate-900 p-6 shadow-xl border border-slate-200 dark:border-slate-800 z-50">
          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mb-3">
              {rejected ? (
                <Crown className="w-6 h-6 text-indigo-500" />
              ) : (
                <Sparkles className="w-6 h-6 text-indigo-500" />
              )}
            </div>
            <AlertDialog.Title className="text-lg font-semibold">
              {rejected ? '无法试用' : '试用会员'}
            </AlertDialog.Title>
            <AlertDialog.Description className="mt-2 text-base text-slate-600 dark:text-slate-300 pre-wrap">
              {rejected
                ? '您已享受过会员功能，请购买会员后再使用。'
                : <>开通试用会员，免费体验 <span className="font-bold text-indigo-500">3 天</span> 全部会员功能，包括所有课程、专属发音和高级配置。</>
              }
            </AlertDialog.Description>
          </div>
          <div className="mt-5 flex gap-3">
            <AlertDialog.Cancel asChild>
              <button className="flex-1 px-3 py-2 rounded-md border border-indigo-200 dark:border-slate-700 text-sm text-indigo-500 hover:bg-indigo-50 dark:hover:bg-slate-800 cursor-pointer">
                取消
              </button>
            </AlertDialog.Cancel>
            {rejected ? (
              <AlertDialog.Action asChild>
                <button
                  onClick={() => { handleClose(); router.push('/vip') }}
                  className="flex-1 px-3 py-2 rounded-md bg-indigo-500 text-white text-sm hover:bg-indigo-600 cursor-pointer"
                >
                  购买会员
                </button>
              </AlertDialog.Action>
            ) : (
              <button
                onClick={handleActivate}
                disabled={loading}
                className="flex-1 px-3 py-2 rounded-md bg-indigo-500 text-white text-sm hover:bg-indigo-600 cursor-pointer disabled:opacity-50"
              >
                {loading ? '激活中...' : '立即试用'}
              </button>
            )}
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}
