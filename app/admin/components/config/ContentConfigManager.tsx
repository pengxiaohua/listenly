'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import { Plus, Edit, Trash2, Loader2, Upload } from 'lucide-react'
import Image from 'next/image'

interface AppConfig {
  id: number
  type: string
  name: string
  content: string
  createdAt: string
  updatedAt: string
}

const getErrorMessage = (error: unknown) => (error instanceof Error ? error.message : '操作失败')

export default function ContentConfigManager() {
  const [configs, setConfigs] = useState<AppConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Partial<AppConfig>>({})
  const [uploading, setUploading] = useState(false)

  const fetchConfigs = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/config')
      const data = await res.json()
      if (Array.isArray(data)) {
        setConfigs(data)
      }
    } catch (error) {
      console.error('加载配置失败:', error)
      toast.error('加载配置失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchConfigs()
  }, [])

  const handleSave = async () => {
    if (!editingItem.name || !editingItem.type || !editingItem.content) {
      toast.error('请填写完整信息')
      return
    }

    try {
      const url = editingItem.id
        ? `/api/admin/config/${editingItem.id}`
        : '/api/admin/config'

      const method = editingItem.id ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingItem)
      })

      const data = await res.json()

      if (!res.ok) throw new Error(data.error || '保存失败')

      toast.success('保存成功')
      setDialogOpen(false)
      fetchConfigs()
    } catch (error: unknown) {
      toast.error(getErrorMessage(error))
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除该配置吗？')) return

    try {
      const res = await fetch(`/api/admin/config/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('删除失败')
      toast.success('删除成功')
      fetchConfigs()
    } catch (error: unknown) {
      toast.error(getErrorMessage(error))
    }
  }

  const handleUpload = async (file: File) => {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/admin/content/upload', {
        method: 'POST',
        body: formData
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '上传失败')

      setEditingItem(prev => ({ ...prev, content: data.url }))
      toast.success('上传成功')
    } catch (error: unknown) {
      toast.error(getErrorMessage(error))
    } finally {
      setUploading(false)
    }
  }

  const renderContentPreview = (type: string, content: string) => {
    if (!content) return '-'
    if (type === 'image') {
      return <div className="relative w-20 h-20"><Image src={content} alt="Preview" fill className="object-cover rounded border" /></div>
    }
    if (type === 'audio') {
      return <audio src={content} controls className="h-8 w-40" />
    }
    if (type === 'video') {
      return <video src={content} className="h-20 w-auto rounded border" />
    }
    return <span className="line-clamp-2 max-w-[200px]">{content}</span>
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">内容配置</h2>
        <Button onClick={() => { setEditingItem({ type: 'text' }); setDialogOpen(true) }}>
          <Plus className="w-4 h-4 mr-2" />
          新建配置
        </Button>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-lg border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>名称/Key</TableHead>
              <TableHead>类型</TableHead>
              <TableHead>内容预览</TableHead>
              <TableHead>更新时间</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-24 text-gray-500">
                  加载中...
                </TableCell>
              </TableRow>
            ) : configs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-24 text-gray-500">
                  暂无配置
                </TableCell>
              </TableRow>
            ) : (
              configs.map((config) => (
                <TableRow key={config.id}>
                  <TableCell>{config.id}</TableCell>
                  <TableCell className="font-medium">{config.name}</TableCell>
                  <TableCell>
                    <span className="px-2 py-1 rounded-full text-xs bg-gray-100 dark:bg-gray-800">
                      {config.type}
                    </span>
                  </TableCell>
                  <TableCell>{renderContentPreview(config.type, config.content)}</TableCell>
                  <TableCell className="text-gray-500 text-sm">
                    {new Date(config.updatedAt).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => { setEditingItem(config); setDialogOpen(true) }}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600" onClick={() => handleDelete(config.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem.id ? '编辑配置' : '新建配置'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">名称 (Unique Key)</label>
              <Input
                value={editingItem.name || ''}
                onChange={e => setEditingItem(prev => ({ ...prev, name: e.target.value }))}
                placeholder="例如: wechat_group_qr"
              />
              <p className="text-xs text-gray-500">用于代码中引用的唯一标识符</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">类型</label>
              <Select
                value={editingItem.type || 'text'}
                onValueChange={val => setEditingItem(prev => ({ ...prev, type: val }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">文本 (Text)</SelectItem>
                  <SelectItem value="image">图片 (Image)</SelectItem>
                  <SelectItem value="audio">音频 (Audio)</SelectItem>
                  <SelectItem value="video">视频 (Video)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">内容</label>
              {editingItem.type === 'text' ? (
                <Textarea
                  value={editingItem.content || ''}
                  onChange={e => setEditingItem(prev => ({ ...prev, content: e.target.value }))}
                  rows={5}
                  placeholder="输入文本内容"
                />
              ) : (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      value={editingItem.content || ''}
                      onChange={e => setEditingItem(prev => ({ ...prev, content: e.target.value }))}
                      placeholder="输入链接或上传文件"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      className="w-full relative"
                      disabled={uploading}
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          上传中...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          点击上传文件
                        </>
                      )}
                      <input
                        type="file"
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
                        accept={editingItem.type === 'image' ? 'image/*' : editingItem.type === 'video' ? 'video/*' : 'audio/*'}
                      />
                    </Button>
                  </div>
                  {editingItem.content && (
                    <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-800 rounded border">
                      <p className="text-xs text-gray-500 mb-1">预览:</p>
                      {renderContentPreview(editingItem.type!, editingItem.content!)}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button onClick={handleSave}>保存</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

