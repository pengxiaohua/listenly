'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { Loader2, Save, Eye, Sparkles, X } from 'lucide-react'
import Image from 'next/image'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import dynamic from 'next/dynamic'

const RichEditor = dynamic(() => import('./RichEditor'), { ssr: false })

interface FeatureUpdateConfig {
  version: string
  title: string
  content: string
  enabled: boolean
}

const defaultConfig: FeatureUpdateConfig = {
  version: '',
  title: '功能更新',
  content: '',
  enabled: false
}

export default function FeatureUpdateManager() {
  const [config, setConfig] = useState<FeatureUpdateConfig>(defaultConfig)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewContent, setPreviewContent] = useState('')
  const [configId, setConfigId] = useState<number | null>(null)

  // 打开预览时解析 oss-key
  const handlePreview = async () => {
    try {
      const res = await fetch('/api/resolve-oss-html', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html: config.content })
      })
      const data = await res.json()
      setPreviewContent(data.html || config.content)
    } catch {
      setPreviewContent(config.content)
    }
    setPreviewOpen(true)
  }

  // 获取配置
  useEffect(() => {
    const fetchConfig = async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/admin/config')
        const configs = await res.json()

        if (Array.isArray(configs)) {
          const featureUpdateConfig = configs.find((c: { name: string }) => c.name === 'feature_update')
          if (featureUpdateConfig) {
            setConfigId(featureUpdateConfig.id)
            try {
              const parsedContent = JSON.parse(featureUpdateConfig.content)
              setConfig(parsedContent)
            } catch {
              console.error('解析配置失败')
            }
          }
        }
      } catch (error) {
        console.error('加载配置失败:', error)
        toast.error('加载配置失败')
      } finally {
        setLoading(false)
      }
    }

    fetchConfig()
  }, [])

  // 保存配置
  const handleSave = async () => {
    if (!config.version.trim()) {
      toast.error('请填写版本号')
      return
    }
    if (!config.title.trim()) {
      toast.error('请填写标题')
      return
    }
    if (!config.content.trim()) {
      toast.error('请填写内容')
      return
    }

    setSaving(true)
    try {
      const url = configId
        ? `/api/admin/config/${configId}`
        : '/api/admin/config'

      const method = configId ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'json',
          name: 'feature_update',
          content: JSON.stringify(config)
        })
      })

      const data = await res.json()

      if (!res.ok) throw new Error(data.error || '保存失败')

      if (!configId) {
        setConfigId(data.id)
      }

      toast.success('保存成功')
    } catch (error) {
      console.error('保存失败:', error)
      toast.error(error instanceof Error ? error.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">功能更新配置</h2>
          <p className="text-sm text-slate-500 mt-1">
            配置用户登录后显示的功能更新弹窗内容
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handlePreview}
            className="cursor-pointer"
          >
            <Eye className="w-4 h-4 mr-2" />
            预览
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="cursor-pointer"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            保存
          </Button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-lg border shadow-sm p-6 space-y-6">
        {/* 启用开关 */}
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium">启用功能更新提醒</label>
            <p className="text-xs text-slate-500 mt-1">
              开启后，用户登录时会看到更新提醒弹窗
            </p>
          </div>
          <Switch
            checked={config.enabled}
            onCheckedChange={(checked) => setConfig(prev => ({ ...prev, enabled: checked }))}
          />
        </div>

        {/* 版本号 */}
        <div className="space-y-2">
          <label className="text-sm font-medium">版本号 *</label>
          <Input
            value={config.version}
            onChange={(e) => setConfig(prev => ({ ...prev, version: e.target.value }))}
            placeholder="例如: v1.2.0 或 2024-01-15"
          />
          <p className="text-xs text-slate-500">
            用于识别用户是否已读过此版本的更新。修改版本号后，所有用户会重新收到提醒。
          </p>
        </div>

        {/* 标题 */}
        <div className="space-y-2">
          <label className="text-sm font-medium">弹窗标题 *</label>
          <Input
            value={config.title}
            onChange={(e) => setConfig(prev => ({ ...prev, title: e.target.value }))}
            placeholder="例如: 🎉 新功能上线"
          />
        </div>

        {/* 富文本编辑器 */}
        <div className="space-y-2">
          <label className="text-sm font-medium">弹窗内容 *</label>
          <RichEditor
            value={config.content}
            onChange={(html) => setConfig(prev => ({ ...prev, content: html }))}
          />
          <p className="text-xs text-slate-500">
            支持富文本编辑，可插入图片（自动上传至 OSS）、设置文字样式等
          </p>
        </div>
      </div>

      {/* 预览弹窗 */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-lg lg:max-w-4xl p-0 overflow-hidden gap-0 border-none">
          <DialogTitle className="sr-only">{config.title || '功能更新'}</DialogTitle>
          <div className="flex">
            {/* Left image — desktop only */}
            <div className="hidden lg:block relative w-[340px] shrink-0">
              <Image
                src="/images/update-img.jpg"
                alt="Feature Update"
                fill
                className="object-contain bg-[#5960ea]"
              />
            </div>

            {/* Right content */}
            <div className="flex-1 flex flex-col p-5 md:p-6 min-w-0 overflow-y-auto max-h-[75vh]">
              <button
                onClick={() => setPreviewOpen(false)}
                className="absolute top-3 right-3 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 cursor-pointer transition-colors z-10"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 text-lg md:text-xl font-semibold pr-8">
                <Sparkles className="w-5 h-5 text-amber-500 shrink-0" />
                {config.title || '功能更新'}
              </div>

              <div
                className="max-w-none mt-4 leading-relaxed text-sm text-slate-600 dark:text-slate-300 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1 [&_a]:text-blue-500 [&_a]:underline [&_img]:max-w-full [&_img]:rounded [&_p]:my-2 flex-1"
                dangerouslySetInnerHTML={{ __html: previewContent || '暂无内容' }}
              />

              <div className="flex justify-end mt-4 pt-2">
                <Button
                  onClick={() => setPreviewOpen(false)}
                  className="w-[100px] cursor-pointer bg-indigo-500 hover:bg-indigo-600"
                >
                  我知道了
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
