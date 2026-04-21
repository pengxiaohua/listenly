'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import Image from 'next/image'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { CustomPagination } from '@/components/ui/pagination'
import { toast } from 'sonner'
import { Plus, Edit, Trash2, Upload, FileVideo, FileJson, CheckCircle } from 'lucide-react'

const CATEGORY_OPTIONS = [
  { value: 'PSYCHOLOGY', label: '心理学' },
  { value: 'PERSONAL_GROWTH', label: '个人成长' },
  { value: 'CAREER_BUSINESS', label: '职场与商业' },
  { value: 'SCIENCE_TECH', label: '科学技术' },
  { value: 'HEALTHY_LIVING', label: '健康生活' },
  { value: 'SPEECH_EXPRESSION', label: '演讲表达' },
  { value: 'PHILOSOPHY_THINKING', label: '哲学与思考' },
]

const CATEGORY_MAP: Record<string, string> = Object.fromEntries(
  CATEGORY_OPTIONS.map((c) => [c.value, c.label])
)

interface VideoItem {
  id: number
  title: string
  titleZh?: string
  author?: string
  description?: string
  category: string
  level?: string
  duration?: number
  tags: string[]
  coverImage?: string
  videoOssKey: string
  subtitles?: unknown
  isPro: boolean
  viewCount: number
  createdAt: string
}

// JSON 文件中解析出的数据
interface ParsedJsonData {
  title: string
  titleZh: string
  author: string
  description: string
  level: string
  duration: string
  tags: string[]
  youtubeId: string
  subtitles: unknown
}

interface EditingVideo {
  id?: number
  category: string
  coverImage: string
  videoOssKey: string
  isPro: boolean
  jsonData: ParsedJsonData | null
  jsonFileName: string
}

function parseVideoJson(raw: unknown): ParsedJsonData | null {
  if (!raw || typeof raw !== 'object') return null
  const obj = raw as Record<string, unknown>

  // title 可能是 string 或 { en, zh }
  let title = ''
  let titleZh = ''
  if (typeof obj.title === 'string') {
    title = obj.title
  } else if (obj.title && typeof obj.title === 'object') {
    const t = obj.title as Record<string, string>
    title = t.en || ''
    titleZh = t.zh || ''
  }

  return {
    title,
    titleZh,
    author: (obj.author as string) || '',
    description: (obj.description as string) || '',
    level: (obj.level as string) || '',
    duration: obj.duration ? String(obj.duration) : '',
    tags: Array.isArray(obj.tags) ? obj.tags : [],
    youtubeId: (obj.video_id as string) || '',
    subtitles: raw, // 整个 JSON 作为 subtitles 存储
  }
}

export default function VideoManager() {
  const [videos, setVideos] = useState<VideoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const pageSize = 20
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<EditingVideo | null>(null)
  const [coverPreviewUrl, setCoverPreviewUrl] = useState('')
  const [videoUploading, setVideoUploading] = useState(false)
  const [coverUploading, setCoverUploading] = useState(false)

  const loadVideos = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/video?page=${page}&pageSize=${pageSize}`)
      const data = await res.json()
      if (data.success) {
        setVideos(data.data.items)
        setTotal(data.data.total)
      }
    } catch (error) {
      console.error('加载视频列表失败:', error)
      toast.error('加载视频列表失败')
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => { loadVideos() }, [loadVideos])

  const handleAdd = () => {
    setEditingItem({
      category: '', coverImage: '', videoOssKey: '', isPro: false,
      jsonData: null, jsonFileName: '',
    })
    setCoverPreviewUrl('')
    setDialogOpen(true)
  }

  const handleEdit = (item: VideoItem) => {
    // 编辑时从已有数据重建 jsonData
    const jsonData: ParsedJsonData = {
      title: item.title,
      titleZh: item.titleZh || '',
      author: item.author || '',
      description: item.description || '',
      level: item.level || '',
      duration: item.duration ? String(item.duration) : '',
      tags: item.tags || [],
      youtubeId: '',
      subtitles: item.subtitles,
    }
    setEditingItem({
      id: item.id,
      category: item.category,
      coverImage: item.coverImage || '',
      videoOssKey: item.videoOssKey,
      isPro: item.isPro,
      jsonData,
      jsonFileName: '(已有数据)',
    })
    const v = (item.coverImage || '').trim()
    if (!v) {
      setCoverPreviewUrl('')
    } else if (/^https?:\/\//i.test(v)) {
      setCoverPreviewUrl(v)
    } else {
      fetch(`/api/admin/sign-oss?key=${encodeURIComponent(v)}`)
        .then(r => r.json())
        .then(d => setCoverPreviewUrl(d?.url || ''))
        .catch(() => setCoverPreviewUrl(''))
    }
    setDialogOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除此视频吗?')) return
    try {
      const res = await fetch(`/api/admin/video?id=${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) { toast.success('删除成功'); loadVideos() }
      else toast.error(data.error || '删除失败')
    } catch { toast.error('删除失败') }
  }

  const handleUploadJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const raw = JSON.parse(ev.target?.result as string)
        const parsed = parseVideoJson(raw)
        if (!parsed || !parsed.title) {
          toast.error('JSON 格式不正确，缺少 title 字段')
          return
        }
        setEditingItem(prev => prev ? { ...prev, jsonData: parsed, jsonFileName: file.name } : prev)
        toast.success(`已解析: ${parsed.title}`)
      } catch {
        toast.error('JSON 文件解析失败')
      }
    }
    reader.readAsText(file)
  }

  const handleUploadVideo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setVideoUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/admin/upload-video', { method: 'POST', body: form })
      const data = await res.json()
      if (!data?.success) { toast.error(data?.error || '上传视频失败'); return }
      setEditingItem(prev => prev ? { ...prev, videoOssKey: data.ossKey } : prev)
      toast.success('视频上传成功')
    } catch { toast.error('上传视频失败') }
    finally { setVideoUploading(false) }
  }

  const handleUploadCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setCoverUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/admin/upload-cover-image', { method: 'POST', body: form })
      const data = await res.json()
      if (!data?.success) { toast.error(data?.error || '上传封面失败'); return }
      setEditingItem(prev => prev ? { ...prev, coverImage: data.ossKey } : prev)
      setCoverPreviewUrl(data.url)
      toast.success('封面上传成功')
    } catch { toast.error('上传封面失败') }
    finally { setCoverUploading(false) }
  }

  const handleSave = async () => {
    if (!editingItem) return
    const { jsonData, category, videoOssKey } = editingItem

    if (!jsonData || !jsonData.title) {
      toast.error('请先上传 JSON 文件')
      return
    }
    if (!category) {
      toast.error('请选择视频分类')
      return
    }
    if (!videoOssKey) {
      toast.error('请上传视频文件')
      return
    }

    try {
      const res = await fetch('/api/admin/video', {
        method: editingItem.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingItem.id,
          title: jsonData.title,
          titleZh: jsonData.titleZh,
          author: jsonData.author,
          description: jsonData.description,
          category,
          level: jsonData.level,
          duration: jsonData.duration,
          tags: jsonData.tags,
          coverImage: editingItem.coverImage,
          videoOssKey,
          youtubeId: jsonData.youtubeId,
          subtitles: jsonData.subtitles,
          isPro: editingItem.isPro,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(editingItem.id ? '更新成功' : '创建成功')
        setDialogOpen(false)
        setEditingItem(null)
        loadVideos()
      } else {
        toast.error(data.error || '操作失败')
      }
    } catch { toast.error('保存失败') }
  }

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '-'
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const jd = editingItem?.jsonData

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">视频管理</h2>
        <Button onClick={handleAdd} className="cursor-pointer">
          <Plus className="w-4 h-4 mr-2" />
          上传视频
        </Button>
      </div>

      {loading ? (
        <div>加载中...</div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>标题</TableHead>
                <TableHead>分类</TableHead>
                <TableHead>等级</TableHead>
                <TableHead>时长</TableHead>
                <TableHead>浏览量</TableHead>
                <TableHead>会员</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {videos.map(item => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium max-w-[200px] truncate">
                    <div>{item.title}</div>
                    {item.titleZh && <div className="text-xs text-gray-400">{item.titleZh}</div>}
                  </TableCell>
                  <TableCell>{CATEGORY_MAP[item.category] || item.category}</TableCell>
                  <TableCell>{item.level || '-'}</TableCell>
                  <TableCell>{formatDuration(item.duration)}</TableCell>
                  <TableCell>{item.viewCount}</TableCell>
                  <TableCell>
                    <Switch
                      checked={item.isPro}
                      onCheckedChange={async (checked) => {
                        try {
                          const res = await fetch('/api/admin/video', {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ id: item.id, isPro: checked }),
                          })
                          const data = await res.json()
                          if (data.success) {
                            setVideos(prev => prev.map(v => v.id === item.id ? { ...v, isPro: checked } : v))
                            toast.success(checked ? '已设为会员专属' : '已取消会员专属')
                          }
                        } catch { toast.error('更新失败') }
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="cursor-pointer" onClick={() => handleEdit(item)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="destructive" className="cursor-pointer" onClick={() => handleDelete(item.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {total > pageSize && (
            <div className="mt-4 flex justify-center">
              <CustomPagination currentPage={page} totalPages={Math.ceil(total / pageSize)} onPageChange={setPage} />
            </div>
          )}
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem?.id ? '编辑' : '上传'}视频</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">

            {/* JSON 文件上传 */}
            <div>
              <label className="block text-sm font-medium mb-1">字幕 JSON 文件 *</label>
              <p className="text-xs text-gray-400 mb-2">上传 JSON 文件后自动提取标题、作者、时长、描述、等级、标签、字幕等信息</p>
              {jd ? (
                <div className="mb-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm space-y-1">
                  <div className="flex items-center gap-2 text-green-700 font-medium">
                    <CheckCircle className="w-4 h-4" />
                    <span>{editingItem?.jsonFileName}</span>
                  </div>
                  <div className="text-gray-600 grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs mt-1">
                    <span>标题: {jd.title}</span>
                    <span>中文: {jd.titleZh || '-'}</span>
                    <span>作者: {jd.author || '-'}</span>
                    <span>时长: {jd.duration ? `${jd.duration}s` : '-'}</span>
                    <span>等级: {jd.level || '-'}</span>
                    <span>标签: {jd.tags.length > 0 ? jd.tags.slice(0, 3).join(', ') : '-'}</span>
                  </div>
                </div>
              ) : null}
              <label className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-md cursor-pointer hover:bg-indigo-100 transition text-sm">
                <FileJson className="w-4 h-4" />
                {jd ? '重新选择 JSON' : '选择 JSON 文件'}
                <input type="file" accept=".json,application/json" className="hidden" onChange={handleUploadJson} />
              </label>
            </div>

            {/* 视频分类 */}
            <div>
              <label className="block text-sm font-medium mb-1">视频分类 *</label>
              <Select
                value={editingItem?.category || ''}
                onValueChange={v => setEditingItem(prev => prev ? { ...prev, category: v } : prev)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择分类" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 视频上传 */}
            <div>
              <label className="block text-sm font-medium mb-1">视频文件 *</label>
              {editingItem?.videoOssKey && (
                <div className="mb-2 flex items-center gap-2 text-sm text-green-600">
                  <FileVideo className="w-4 h-4" />
                  <span className="truncate max-w-[400px]">{editingItem.videoOssKey}</span>
                </div>
              )}
              <label className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-md cursor-pointer hover:bg-indigo-100 transition text-sm">
                <Upload className="w-4 h-4" />
                {videoUploading ? '上传中...' : '选择视频文件'}
                <input type="file" accept="video/*" className="hidden" onChange={handleUploadVideo} disabled={videoUploading} />
              </label>
            </div>

            {/* 封面图上传 */}
            <div>
              <label className="block text-sm font-medium mb-1">封面图</label>
              {coverPreviewUrl && (
                <div className="mb-2">
                  <Image src={coverPreviewUrl} alt="封面图" width={240} height={135} className="rounded object-cover w-60 h-[135px]" />
                </div>
              )}
              <label className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 text-gray-600 rounded-md cursor-pointer hover:bg-gray-100 transition text-sm border">
                <Upload className="w-4 h-4" />
                {coverUploading ? '上传中...' : '选择封面图'}
                <input type="file" accept="image/*" className="hidden" onChange={handleUploadCover} disabled={coverUploading} />
              </label>
            </div>

            {/* 会员专属 */}
            <div className="flex items-center gap-2">
              <Switch
                checked={editingItem?.isPro || false}
                onCheckedChange={checked => setEditingItem(prev => prev ? { ...prev, isPro: checked } : prev)}
              />
              <label className="text-sm font-medium">会员专属</label>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setDialogOpen(false)} className="cursor-pointer">取消</Button>
              <Button onClick={handleSave} className="cursor-pointer">保存</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
