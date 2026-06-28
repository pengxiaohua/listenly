'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

type ExportScope = 'vocabulary' | 'wrong'
type ExportItemType = 'word' | 'sentence'
type ExportFormat = 'pdf' | 'word' | 'excel'
type ExportContent = 'both' | 'term' | 'translation'

type PreviewItem = {
  id: number
  term: string
  translation: string
  createdAt: string
}

interface ReviewDownloadDialogProps {
  scope: ExportScope
  itemType: ExportItemType
  total: number
}

const scopeLabel: Record<ExportScope, string> = {
  vocabulary: '生词本',
  wrong: '错词本',
}

const itemTypeLabel: Record<ExportItemType, string> = {
  word: '单词',
  sentence: '句子',
}

const formatOptions: Array<{ value: ExportFormat; label: string }> = [
  { value: 'pdf', label: 'PDF' },
  { value: 'word', label: 'WORD' },
  { value: 'excel', label: 'EXCEL' },
]

function getContentOptions(itemType: ExportItemType): Array<{ value: ExportContent; label: string }> {
  const primary = itemType === 'word' ? '单词' : '句子'
  return [
    { value: 'both', label: `${primary}和翻译` },
    { value: 'term', label: `仅${primary}` },
    { value: 'translation', label: '仅翻译' },
  ]
}

function getFileNameFromContentDisposition(header: string | null) {
  if (!header) return ''
  const encoded = header.match(/filename\*=UTF-8''([^;]+)/)
  if (encoded?.[1]) {
    try {
      return decodeURIComponent(encoded[1])
    } catch {}
  }

  const fallback = header.match(/filename="([^"]+)"/)
  return fallback?.[1] || ''
}

export default function ReviewDownloadDialog({ scope, itemType, total }: ReviewDownloadDialogProps) {
  const [open, setOpen] = useState(false)
  const [format, setFormat] = useState<ExportFormat>('pdf')
  const [content, setContent] = useState<ExportContent>('both')
  const [previewItems, setPreviewItems] = useState<PreviewItem[]>([])
  const [previewLoading, setPreviewLoading] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const contentOptions = useMemo(() => getContentOptions(itemType), [itemType])
  const primaryLabel = itemTypeLabel[itemType]
  const title = `${scopeLabel[scope]}-${primaryLabel}下载`

  const buildParams = useCallback((extra?: Record<string, string>) => {
    const params = new URLSearchParams({
      scope,
      type: itemType,
      content,
      ...(extra || {}),
    })
    return params.toString()
  }, [scope, itemType, content])

  useEffect(() => {
    if (!open) return
    setPreviewLoading(true)
    fetch(`/api/my/export?${buildParams({ preview: 'true' })}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setPreviewItems(data.data || [])
        } else {
          toast.error(data.error || '预览加载失败')
        }
      })
      .catch(() => toast.error('预览加载失败'))
      .finally(() => setPreviewLoading(false))
  }, [open, buildParams])

  const handleDownload = async () => {
    try {
      setDownloading(true)
      const response = await fetch(`/api/my/export?${buildParams({ format })}`)
      if (!response.ok) {
        const data = await response.json().catch(() => null)
        toast.error(data?.error || '下载失败')
        return
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = getFileNameFromContentDisposition(response.headers.get('Content-Disposition')) || `listenly-${scope}-${itemType}.${format}`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
      toast.success('下载已开始')
    } catch {
      toast.error('下载失败')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <>
      <button
        type="button"
        disabled={total === 0}
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-2 py-1.5 md:px-4 md:py-2 border border-slate-200 bg-white text-slate-700 rounded-full hover:bg-slate-50 transition-colors text-xs md:text-sm font-medium cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
      >
        <Download className="w-3 h-3 md:w-4 md:h-4" />
        下载
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium text-slate-700 mb-2">下载格式</div>
                <div className="flex flex-wrap gap-2">
                  {formatOptions.map(option => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setFormat(option.value)}
                      className={`px-3 py-1.5 rounded-full text-sm border transition-colors cursor-pointer ${
                        format === option.value
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-sm font-medium text-slate-700 mb-2">下载内容</div>
                <div className="flex flex-wrap gap-2">
                  {contentOptions.map(option => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setContent(option.value)}
                      className={`px-3 py-1.5 rounded-full text-sm border transition-colors cursor-pointer ${
                        content === option.value
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-200">
                <span className="text-sm font-medium text-slate-700">下载前预览</span>
                <span className="text-xs text-slate-500">共 {previewItems.length} 条</span>
              </div>

              <div className="max-h-[360px] overflow-auto">
                {previewLoading ? (
                  <div className="h-28 flex items-center justify-center text-slate-500">
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    正在加载预览...
                  </div>
                ) : previewItems.length === 0 ? (
                  <div className="h-28 flex items-center justify-center text-slate-400">暂无可下载内容</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-white">
                      <tr className="border-b border-slate-200 text-left text-slate-500">
                        <th className="px-3 py-2 w-16 font-medium">序号</th>
                        {(content === 'both' || content === 'term') && (
                          <th className="px-3 py-2 font-medium">{primaryLabel}</th>
                        )}
                        {(content === 'both' || content === 'translation') && (
                          <th className="px-3 py-2 font-medium">翻译</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {previewItems.map((item, index) => (
                        <tr key={`${item.id}-${index}`} className="border-b border-slate-100 last:border-b-0">
                          <td className="px-3 py-2 text-slate-500">{index + 1}</td>
                          {(content === 'both' || content === 'term') && (
                            <td className="px-3 py-2 align-top text-slate-900 whitespace-pre-wrap break-words">{item.term || '-'}</td>
                          )}
                          {(content === 'both' || content === 'translation') && (
                            <td className="px-3 py-2 align-top text-slate-600 whitespace-pre-wrap break-words">{item.translation || '-'}</td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={downloading}>
              取消
            </Button>
            <Button onClick={handleDownload} disabled={downloading || previewLoading || previewItems.length === 0}>
              {downloading && <Loader2 className="w-4 h-4 animate-spin" />}
              确认下载
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
