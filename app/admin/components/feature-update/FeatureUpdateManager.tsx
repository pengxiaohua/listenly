'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { Loader2, Save, Eye, Sparkles } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'

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
  const [configId, setConfigId] = useState<number | null>(null)

  // 获取配置
  useEffect(() => {
    const fetchConfig = async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/admin/config')
        const configs = await res.json()

        if (Array.isArray(configs)) {
          const featureUpdateConfig = configs.find(c => c.name === 'feature_update')
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
            onClick={() => setPreviewOpen(true)}
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

        {/* 内容 */}
        <div className="space-y-2">
          <label className="text-sm font-medium">弹窗内容 *</label>
          <Textarea
            value={config.content}
            onChange={(e) => setConfig(prev => ({ ...prev, content: e.target.value }))}
            placeholder="支持 HTML 标签，如 <b>加粗</b>、<br/> 换行等"
            rows={8}
          />
          <p className="text-xs text-slate-500">
            支持 HTML 格式，可以使用 &lt;b&gt;加粗&lt;/b&gt;、&lt;br/&gt; 换行、&lt;ul&gt;&lt;li&gt;列表&lt;/li&gt;&lt;/ul&gt; 等标签
          </p>
        </div>
      </div>

      {/* 预览弹窗 */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Sparkles className="w-5 h-5 text-amber-500" />
              {config.title || '功能更新'}
            </DialogTitle>
            <DialogDescription asChild>
              <div
                className="text-sm text-muted-foreground mt-4 whitespace-pre-wrap leading-relaxed"
                dangerouslySetInnerHTML={{ __html: config.content || '暂无内容' }}
              />
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button
              onClick={() => setPreviewOpen(false)}
              className="w-[100px] cursor-pointer bg-indigo-500 hover:bg-indigo-600"
            >
              我知道了
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
