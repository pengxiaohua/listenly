'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useAuthStore } from '@/store/auth'
import { useFeatureUpdateStore } from '@/store/featureUpdate'
import { Button } from '@/components/ui/button'
import { Sparkles, X } from 'lucide-react'

interface FeatureUpdateConfig {
  version: string
  title: string
  content: string
  enabled: boolean
}

async function resolveOssKeys(html: string): Promise<string> {
  const res = await fetch('/api/resolve-oss-html', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ html })
  })
  if (!res.ok) return html
  const data = await res.json()
  return data.html || html
}

export default function FeatureUpdateDialog() {
  const [open, setOpen] = useState(false)
  const [config, setConfig] = useState<FeatureUpdateConfig | null>(null)
  const [resolvedContent, setResolvedContent] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const { isLogged, isInitialized } = useAuthStore()
  const setDialogOpen = useFeatureUpdateStore(state => state.setDialogOpen)

  useEffect(() => {
    setDialogOpen(open)
  }, [open, setDialogOpen])

  useEffect(() => {
    if (!isLogged || !isInitialized) return
    const checkFeatureUpdate = async () => {
      try {
        const configRes = await fetch('/api/config?key=feature_update')
        if (!configRes.ok) return
        const configData = await configRes.json()
        if (!configData.content) return
        const featureConfig: FeatureUpdateConfig = JSON.parse(configData.content)
        if (!featureConfig.enabled) return
        const userRes = await fetch('/api/user/feature-update-read')
        if (!userRes.ok) return
        const userData = await userRes.json()
        const readVersion = userData.readVersion || ''
        if (readVersion !== featureConfig.version) {
          const resolved = await resolveOssKeys(featureConfig.content)
          setResolvedContent(resolved)
          setConfig(featureConfig)
          setOpen(true)
        }
      } catch (error) {
        console.error('检查功能更新失败:', error)
      }
    }
    checkFeatureUpdate()
  }, [isLogged, isInitialized])

  const handleConfirm = async () => {
    if (!config) return
    setLoading(true)
    try {
      await fetch('/api/user/feature-update-read', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version: config.version })
      })
      setOpen(false)
    } catch (error) {
      console.error('标记已读失败:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!config || !open) return null

  return (
    <div className="fixed inset-0 z-50">
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50" />

      {/* Dialog */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden flex max-w-4xl w-full max-h-[85vh]">

          {/* Left image — desktop only */}
          <div className="hidden md:block relative w-[340px] shrink-0">
            <Image
              src="/images/update-img.jpg"
              alt="Feature Update"
              fill
              className="object-contain bg-[#5960ea]"
            />
          </div>

          {/* Right content */}
          <div className="flex-1 flex flex-col p-5 md:p-6 min-w-0 overflow-y-auto">
            {/* Close button */}
            <button
              onClick={handleConfirm}
              disabled={loading}
              className="absolute top-3 right-3 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 cursor-pointer transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Title */}
            <div className="flex items-center gap-2 text-lg md:text-xl font-semibold pr-8">
              <Sparkles className="w-5 h-5 text-amber-500 shrink-0" />
              {config.title}
            </div>

            {/* Content */}
            <div
              className="max-w-none mt-4 leading-relaxed text-sm text-slate-600 dark:text-slate-300 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1 [&_a]:text-blue-500 [&_a]:underline [&_img]:max-w-full [&_img]:rounded [&_p]:my-2 flex-1"
              dangerouslySetInnerHTML={{ __html: resolvedContent }}
            />

            {/* Footer */}
            <div className="flex justify-end mt-4 pt-2">
              <Button
                onClick={handleConfirm}
                disabled={loading}
                className="w-[100px] cursor-pointer bg-indigo-500 hover:bg-indigo-600"
              >
                {loading ? '请稍候...' : '我知道了'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
