'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Pagination } from '@/components/ui/pagination'
import { toast } from 'sonner'
import { Plus, Edit, Trash2 } from 'lucide-react'

interface WordSet {
  id: number
  uuid: string
  name: string
  slug: string
  description?: string
  coverImage?: string
  isPro: boolean
  ossDir?: string
  catalogFirst?: { id: number, name: string }
  catalogSecond?: { id: number, name: string }
  catalogThird?: { id: number, name: string }
  _count: { words: number }
}

interface CatalogFirst {
  id: number
  name: string
  slug: string
  seconds: CatalogSecond[]
}

interface CatalogSecond {
  id: number
  name: string
  slug: string
  thirds: CatalogThird[]
}

interface CatalogThird {
  id: number
  name: string
  slug: string
}

export default function WordSetManager() {
  const [wordSets, setWordSets] = useState<WordSet[]>([])
  const [catalogs, setCatalogs] = useState<CatalogFirst[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const pageSize = 20
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Partial<WordSet> | null>(null)

  useEffect(() => {
    loadCatalogs()
    loadWordSets()
  }, [page])

  const loadCatalogs = async () => {
    try {
      const res = await fetch('/api/admin/catalog?type=WORD')
      const data = await res.json()
      if (data.success) {
        setCatalogs(data.data)
      }
    } catch (error) {
      console.error('加载目录失败:', error)
    }
  }

  const loadWordSets = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/word-set?page=${page}&pageSize=${pageSize}`)
      const data = await res.json()
      if (data.success) {
        setWordSets(data.data.items)
        setTotal(data.data.total)
      }
    } catch (error) {
      console.error('加载单词集失败:', error)
      toast.error('加载单词集失败')
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = () => {
    // 打开对话框前重新加载目录,确保获取最新数据
    loadCatalogs()
    setEditingItem({
      name: '',
      slug: '',
      description: '',
      isPro: false,
      catalogFirstId: undefined,
      catalogSecondId: undefined,
      catalogThirdId: undefined,
      ossDir: ''
    })
    setDialogOpen(true)
  }

  const handleEdit = (item: WordSet) => {
    // 打开对话框前重新加载目录,确保获取最新数据
    loadCatalogs()
    setEditingItem({
      id: item.id,
      name: item.name,
      slug: item.slug,
      description: item.description,
      coverImage: item.coverImage,
      isPro: item.isPro,
      catalogFirstId: item.catalogFirst?.id,
      catalogSecondId: item.catalogSecond?.id,
      catalogThirdId: item.catalogThird?.id,
      ossDir: item.ossDir
    })
    setDialogOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除此单词集吗?')) return

    try {
      const res = await fetch(`/api/admin/word-set?id=${id}`, {
        method: 'DELETE'
      })
      const data = await res.json()
      if (data.success) {
        toast.success('删除成功')
        loadWordSets()
      } else {
        toast.error(data.error || '删除失败')
      }
    } catch (error) {
      console.error('删除失败:', error)
      toast.error('删除失败')
    }
  }

  const handleSave = async () => {
    if (!editingItem || !editingItem.name || !editingItem.slug || !editingItem.catalogFirstId) {
      toast.error('请填写必要信息')
      return
    }

    try {
      const res = await fetch('/api/admin/word-set', {
        method: editingItem.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editingItem,
          ossDir: editingItem.ossDir || `words/${editingItem.slug}`
        })
      })

      const data = await res.json()
      if (data.success) {
        toast.success(editingItem.id ? '更新成功' : '创建成功')
        setDialogOpen(false)
        setEditingItem(null)
        loadWordSets()
      } else {
        toast.error(data.error || '操作失败')
      }
    } catch (error) {
      console.error('保存失败:', error)
      toast.error('保存失败')
    }
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">单词内容管理</h2>
        <Button onClick={handleAdd}>
          <Plus className="w-4 h-4 mr-2" />
          添加单词集
        </Button>
      </div>

      {loading ? (
        <div>加载中...</div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>名称</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>目录</TableHead>
                <TableHead>单词数</TableHead>
                <TableHead>会员专属</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {wordSets.map(item => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{item.slug}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {item.catalogFirst?.name}
                      {item.catalogSecond && ` > ${item.catalogSecond.name}`}
                      {item.catalogThird && ` > ${item.catalogThird.name}`}
                    </div>
                  </TableCell>
                  <TableCell>{item._count.words}</TableCell>
                  <TableCell>{item.isPro ? '是' : '否'}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleEdit(item)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(item.id)}>
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
              <Pagination
                currentPage={page}
                totalPages={Math.ceil(total / pageSize)}
                onPageChange={setPage}
              />
            </div>
          )}
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem?.id ? '编辑' : '添加'}单词集</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">名称</label>
              <Input
                value={editingItem?.name || ''}
                onChange={e => setEditingItem(prev => ({ ...prev, name: e.target.value }))}
                placeholder="例如: 四级核心词汇"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Slug (英文标识)</label>
              <Input
                value={editingItem?.slug || ''}
                onChange={e => setEditingItem(prev => ({ ...prev, slug: e.target.value }))}
                placeholder="例如: cet4"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">描述</label>
              <Input
                value={editingItem?.description || ''}
                onChange={e => setEditingItem(prev => ({ ...prev, description: e.target.value }))}
                placeholder="请输入描述"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">一级目录</label>
              <Select
                value={editingItem?.catalogFirstId?.toString()}
                onValueChange={v => setEditingItem(prev => ({ ...prev, catalogFirstId: parseInt(v), catalogSecondId: undefined, catalogThirdId: undefined }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择一级目录" />
                </SelectTrigger>
                <SelectContent>
                  {catalogs.map(cat => (
                    <SelectItem key={cat.id} value={cat.id.toString()}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {editingItem?.catalogFirstId && (
              <div>
                <label className="block text-sm font-medium mb-1">二级目录 (可选)</label>
                <Select
                  value={editingItem?.catalogSecondId?.toString() || 'NONE'}
                  onValueChange={v => setEditingItem(prev => ({ ...prev, catalogSecondId: v === 'NONE' ? undefined : parseInt(v), catalogThirdId: undefined }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择二级目录" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">无</SelectItem>
                    {catalogs.find(c => c.id === editingItem.catalogFirstId)?.seconds.map(cat => (
                      <SelectItem key={cat.id} value={cat.id.toString()}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {editingItem?.catalogSecondId && (
              <div>
                <label className="block text-sm font-medium mb-1">三级目录 (可选)</label>
                <Select
                  value={editingItem?.catalogThirdId?.toString() || 'NONE'}
                  onValueChange={v => setEditingItem(prev => ({ ...prev, catalogThirdId: v === 'NONE' ? undefined : parseInt(v) }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择三级目录" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">无</SelectItem>
                    {catalogs
                      .find(c => c.id === editingItem.catalogFirstId)?.seconds
                      .find(s => s.id === editingItem.catalogSecondId)?.thirds.map(cat => (
                        <SelectItem key={cat.id} value={cat.id.toString()}>{cat.name}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium mb-1">OSS目录</label>
              <Input
                value={editingItem?.ossDir || ''}
                onChange={e => setEditingItem(prev => ({ ...prev, ossDir: e.target.value }))}
                placeholder={`默认: words/${editingItem?.slug || '...'}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">封面图</label>
              <Input
                value={editingItem?.coverImage || ''}
                onChange={e => setEditingItem(prev => ({ ...prev, coverImage: e.target.value }))}
                placeholder="封面图URL"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={editingItem?.isPro || false}
                onCheckedChange={checked => setEditingItem(prev => ({ ...prev, isPro: checked }))}
              />
              <label className="text-sm font-medium">会员专属</label>
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
