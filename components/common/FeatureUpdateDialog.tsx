'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/auth'
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

export default function FeatureUpdateDialog() {
  const [open, setOpen] = useState(false)
  const [config, setConfig] = useState<FeatureUpdateConfig | null>(null)
  const [loading, setLoading] = useState(false)
  const { isLogged, isInitialized } = useAuthStore()

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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="w-5 h-5 text-amber-500" />
            {config.title}
          </DialogTitle>
          <DialogDescription asChild>
            <div
              className="text-sm text-muted-foreground mt-4 whitespace-pre-wrap leading-relaxed"
              dangerouslySetInnerHTML={{ __html: config.content }}
            />
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-4">
          <Button
            onClick={handleConfirm}
            disabled={loading}
            className="w-[100px] cursor-pointer bg-blue-500 hover:bg-blue-600"
          >
            {loading ? '请稍候...' : '我知道了'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
