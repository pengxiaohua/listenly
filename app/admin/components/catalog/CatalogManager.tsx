'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Plus, Edit, Trash2, ChevronRight, ChevronDown } from 'lucide-react'

interface CatalogThird {
  id: number
  name: string
  slug: string
  description?: string
  displayOrder: number
}

interface CatalogSecond {
  id: number
  name: string
  slug: string
  description?: string
  displayOrder: number
  thirds: CatalogThird[]
}

interface CatalogFirst {
  id: number
  name: string
  slug: string
  displayOrder: number
  seconds: CatalogSecond[]
}

export default function CatalogManager() {
  const [catalogs, setCatalogs] = useState<CatalogFirst[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [dialogOpen, setDialogOpen] = useState(false)
  const [contentType, setContentType] = useState<'WORD' | 'SENTENCE'>('WORD')
  const [editingItem, setEditingItem] = useState<{
    level: 'first' | 'second' | 'third'
    id?: number
    parentId?: number
    name: string
    slug: string
    type: 'WORD' | 'SENTENCE'
    description?: string
    displayOrder: number
  } | null>(null)

  useEffect(() => {
    loadCatalogs()
  }, [contentType])

  const loadCatalogs = async () => {
    try {
      const res = await fetch(`/api/admin/catalog?type=${contentType}`)
      const data = await res.json()
      if (data.success) {
        setCatalogs(data.data)
      }
    } catch (error) {
      console.error('加载目录失败:', error)
      toast.error('加载目录失败')
    } finally {
      setLoading(false)
    }
  }

  const toggleExpand = (key: string) => {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const handleAdd = (level: 'first' | 'second' | 'third', parentId?: number) => {
    setEditingItem({
      level,
      parentId,
      name: '',
      slug: '',
      type: contentType, // 默认使用当前选择的类型
      description: '',
      displayOrder: 0
    })
    setDialogOpen(true)
  }

  const handleEdit = (item: CatalogFirst | CatalogSecond | CatalogThird, level: 'first' | 'second' | 'third', parentId?: number) => {
    setEditingItem({
      level,
      id: item.id,
      parentId,
      name: item.name,
      slug: item.slug,
      type: 'type' in item ? (item.type as 'WORD' | 'SENTENCE') : 'WORD',
      description: 'description' in item ? item.description : '',
      displayOrder: item.displayOrder
    })
    setDialogOpen(true)
  }

  const handleDelete = async (id: number, level: 'first' | 'second' | 'third') => {
    if (!confirm('确定要删除此目录吗?这将删除所有子目录!')) return

    try {
      const res = await fetch(`/api/admin/catalog?level=${level}&id=${id}`, {
        method: 'DELETE'
      })
      const data = await res.json()
      if (data.success) {
        toast.success('删除成功')
        loadCatalogs()
      } else {
        toast.error(data.error || '删除失败')
      }
    } catch (error) {
      console.error('删除失败:', error)
      toast.error('删除失败')
    }
  }

  const handleSave = async () => {
    if (!editingItem || !editingItem.name || !editingItem.slug || !editingItem.type) {
      toast.error('请填写必要信息')
      return
    }

    try {
      const body: Record<string, unknown> = {
        level: editingItem.level,
        name: editingItem.name,
        slug: editingItem.slug,
        type: editingItem.type,
        description: editingItem.description,
        displayOrder: editingItem.displayOrder
      }

      if (editingItem.id) {
        body.id = editingItem.id
      }

      if (editingItem.level === 'second' && editingItem.parentId) {
        body.firstId = editingItem.parentId
      }

      if (editingItem.level === 'third' && editingItem.parentId) {
        body.secondId = editingItem.parentId
      }

      const res = await fetch('/api/admin/catalog', {
        method: editingItem.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      const data = await res.json()
      if (data.success) {
        toast.success(editingItem.id ? '更新成功' : '创建成功')
        setDialogOpen(false)
        setEditingItem(null)
        loadCatalogs()
      } else {
        toast.error(data.error || '操作失败')
      }
    } catch (error) {
      console.error('保存失败:', error)
      toast.error('保存失败')
    }
  }

  if (loading) {
    return <div className="p-4">加载中...</div>
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold">目录管理</h2>
          <div className="flex gap-2">
            <Button
              variant={contentType === 'WORD' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setContentType('WORD')}
            >
              单词目录
            </Button>
            <Button
              variant={contentType === 'SENTENCE' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setContentType('SENTENCE')}
            >
              句子目录
            </Button>
          </div>
        </div>
        <Button onClick={() => handleAdd('first')}>
          <Plus className="w-4 h-4 mr-2" />
          添加一级目录
        </Button>
      </div>

      <div className="space-y-2">
        {catalogs.map(first => (
          <div key={`first-${first.id}`} className="border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button onClick={() => toggleExpand(`first-${first.id}`)}>
                  {expanded[`first-${first.id}`] ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                </button>
                <span className="font-bold text-lg">{first.name}</span>
                <span className="text-sm text-gray-500">({first.slug})</span>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => handleAdd('second', first.id)}>
                  <Plus className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleEdit(first, 'first')}>
                  <Edit className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="destructive" onClick={() => handleDelete(first.id, 'first')}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {expanded[`first-${first.id}`] && (
              <div className="ml-8 mt-4 space-y-2">
                {first.seconds.map(second => (
                  <div key={`second-${second.id}`} className="border rounded p-3 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button onClick={() => toggleExpand(`second-${second.id}`)}>
                          {expanded[`second-${second.id}`] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                        <span className="font-semibold">{second.name}</span>
                        <span className="text-sm text-gray-500">({second.slug})</span>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleAdd('third', second.id)}>
                          <Plus className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleEdit(second, 'second', first.id)}>
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDelete(second.id, 'second')}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>

                    {expanded[`second-${second.id}`] && (
                      <div className="ml-6 mt-2 space-y-1">
                        {second.thirds.map(third => (
                          <div key={`third-${third.id}`} className="flex items-center justify-between p-2 bg-white rounded">
                            <div>
                              <span>{third.name}</span>
                              <span className="text-sm text-gray-500 ml-2">({third.slug})</span>
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => handleEdit(third, 'third', second.id)}>
                                <Edit className="w-3 h-3" />
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => handleDelete(third.id, 'third')}>
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem?.id ? '编辑' : '添加'}目录</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">名称</label>
              <Input
                value={editingItem?.name || ''}
                onChange={e => setEditingItem(prev => prev ? { ...prev, name: e.target.value } : null)}
                placeholder="请输入名称"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Slug (英文标识)</label>
              <Input
                value={editingItem?.slug || ''}
                onChange={e => setEditingItem(prev => prev ? { ...prev, slug: e.target.value } : null)}
                placeholder="例如: cet4"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">类型 <span className="text-red-500">*</span></label>
              <Select
                value={editingItem?.type || 'WORD'}
                onValueChange={v => setEditingItem(prev => prev ? { ...prev, type: v as 'WORD' | 'SENTENCE' } : null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WORD">单词</SelectItem>
                  <SelectItem value="SENTENCE">句子</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {editingItem?.level !== 'first' && (
              <div>
                <label className="block text-sm font-medium mb-1">描述</label>
                <Input
                  value={editingItem?.description || ''}
                  onChange={e => setEditingItem(prev => prev ? { ...prev, description: e.target.value } : null)}
                  placeholder="请输入描述"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium mb-1">排序</label>
              <Input
                type="number"
                value={editingItem?.displayOrder || 0}
                onChange={e => setEditingItem(prev => prev ? { ...prev, displayOrder: parseInt(e.target.value) } : null)}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
              <Button onClick={handleSave}>保存</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
