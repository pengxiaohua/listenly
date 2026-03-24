'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/auth'
import { useFeatureUpdateStore } from '@/store/featureUpdate'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Sparkles } from 'lucide-react'

interface FeatureUpdateConfig {
  version: string
  title: string
  content: string
  enabled: boolean
}

/**
 * 将 HTML 中的 oss-key:// 占位符替换为签名 URL
 */
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

  // 同步 open 状态到全局 store，供 GuidedTour 等组件判断
  useEffect(() => {
    setDialogOpen(open)
  }, [open, setDialogOpen])

  // 获取功能更新配置并检查是否需要显示
  useEffect(() => {
    if (!isLogged || !isInitialized) return

    const checkFeatureUpdate = async () => {
      try {
        // 获取功能更新配置
        const configRes = await fetch('/api/config?key=feature_update')
        if (!configRes.ok) return

        const configData = await configRes.json()
        if (!configData.content) return

        const featureConfig: FeatureUpdateConfig = JSON.parse(configData.content)

        // 检查是否启用
        if (!featureConfig.enabled) return

        // 获取用户已读版本
        const userRes = await fetch('/api/user/feature-update-read')
        if (!userRes.ok) return

        const userData = await userRes.json()
        const readVersion = userData.readVersion || ''

        // 如果用户未读过这个版本，显示弹窗
        if (readVersion !== featureConfig.version) {
          // 解析 oss-key:// 为签名 URL
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
      // 标记该版本为已读
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

  if (!config) return null

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-lg md:max-w-xl [&>button:last-child]:hidden" onPointerDownOutside={e => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="w-5 h-5 text-amber-500" />
            {config.title}
          </DialogTitle>
          <DialogDescription asChild>
            <div
              className="max-w-none mt-4 leading-relaxed text-sm [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1 [&_a]:text-blue-500 [&_a]:underline [&_img]:max-w-full [&_img]:rounded [&_p]:my-2"
              dangerouslySetInnerHTML={{ __html: resolvedContent }}
            />
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-4">
          <Button
            onClick={handleConfirm}
            disabled={loading}
            className="w-[100px] cursor-pointer bg-indigo-500 hover:bg-indigo-600"
          >
            {loading ? '请稍候...' : '我知道了'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
