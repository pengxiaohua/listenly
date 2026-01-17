'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { CustomPagination } from '@/components/ui/pagination'
import { toast } from 'sonner'
import { Edit, Trash2 } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'

interface SentenceSet {
  id: number
  name: string
}

interface WordSet {
  id: number
  name: string
}

interface Sentence {
  id: number
  text: string
  translation: string | null
  index: number
}

interface Word {
  id: string
  word: string
  translation: string
  phoneticUS: string
}

export default function ContentEditor() {
  const [activeTab, setActiveTab] = useState<'sentence' | 'word'>('sentence')
  const [sentenceSets, setSentenceSets] = useState<SentenceSet[]>([])
  const [wordSets, setWordSets] = useState<WordSet[]>([])
  const [selectedSentenceSetId, setSelectedSentenceSetId] = useState<number | null>(null)
  const [selectedWordSetId, setSelectedWordSetId] = useState<number | null>(null)
  const [sentences, setSentences] = useState<Sentence[]>([])
  const [words, setWords] = useState<Word[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const pageSize = 50
  const [searchText, setSearchText] = useState('')
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Sentence | Word | null>(null)
  const [deleteItem, setDeleteItem] = useState<Sentence | Word | null>(null)
  const [editForm, setEditForm] = useState({
    text: '',
    translation: '',
    word: '',
    phoneticUS: ''
  })

  // 加载句子集列表
  const loadSentenceSets = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/sentence-set?page=1&pageSize=1000')
      const data = await res.json()
      if (data.success) {
        setSentenceSets(data.data.items)
      }
    } catch (error) {
      console.error('加载句子集失败:', error)
    }
  }, [])

  // 加载单词集列表
  const loadWordSets = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/word-set?page=1&pageSize=1000')
      const data = await res.json()
      if (data.success) {
        setWordSets(data.data.items)
      }
    } catch (error) {
      console.error('加载单词集失败:', error)
    }
  }, [])

  // 加载句子列表
  const loadSentences = useCallback(async () => {
    if (!selectedSentenceSetId) {
      setSentences([])
      setTotal(0)
      return
    }

    setLoading(true)
    try {
      const params = new URLSearchParams({
        sentenceSetId: selectedSentenceSetId.toString(),
        page: page.toString(),
        pageSize: pageSize.toString()
      })
      if (searchText.trim()) {
        params.set('search', searchText.trim())
      }

      const res = await fetch(`/api/sentence/admin?${params.toString()}`)
      const data = await res.json()
      if (data.success) {
        setSentences(data.data)
        setTotal(data.pagination.total)
      } else {
        toast.error(data.error || '加载句子失败')
      }
    } catch (error) {
      console.error('加载句子失败:', error)
      toast.error('加载句子失败')
    } finally {
      setLoading(false)
    }
  }, [selectedSentenceSetId, page, pageSize, searchText])

  // 加载单词列表
  const loadWords = useCallback(async () => {
    if (!selectedWordSetId) {
      setWords([])
      setTotal(0)
      return
    }

    setLoading(true)
    try {
      const params = new URLSearchParams({
        wordSetId: selectedWordSetId.toString(),
        page: page.toString(),
        pageSize: pageSize.toString()
      })
      if (searchText.trim()) {
        params.set('search', searchText.trim())
      }

      const res = await fetch(`/api/admin/word?${params.toString()}`)
      const data = await res.json()
      if (data.success) {
        setWords(data.data)
        setTotal(data.pagination.total)
      } else {
        toast.error(data.error || '加载单词失败')
      }
    } catch (error) {
      console.error('加载单词失败:', error)
      toast.error('加载单词失败')
    } finally {
      setLoading(false)
    }
  }, [selectedWordSetId, page, pageSize, searchText])

  useEffect(() => {
    loadSentenceSets()
    loadWordSets()
  }, [loadSentenceSets, loadWordSets])

  useEffect(() => {
    if (activeTab === 'sentence') {
      loadSentences()
    } else {
      loadWords()
    }
  }, [activeTab, loadSentences, loadWords])

  // 切换tab时重置
  useEffect(() => {
    setPage(1)
    setSearchText('')
    setSelectedSentenceSetId(null)
    setSelectedWordSetId(null)
  }, [activeTab])

  // 搜索文本变化时，如果是句子tab，重新加载
  useEffect(() => {
    if (activeTab === 'sentence' && selectedSentenceSetId) {
      const timer = setTimeout(() => {
        setPage(1)
        loadSentences()
      }, 500) // 防抖
      return () => clearTimeout(timer)
    }
  }, [searchText, activeTab, selectedSentenceSetId, loadSentences])

  // 搜索文本变化时，如果是单词tab，重新加载
  useEffect(() => {
    if (activeTab === 'word' && selectedWordSetId) {
      const timer = setTimeout(() => {
        setPage(1)
        loadWords()
      }, 500) // 防抖
      return () => clearTimeout(timer)
    }
  }, [searchText, activeTab, selectedWordSetId, loadWords])

  const handleEdit = (item: Sentence | Word) => {
    setEditingItem(item)
    if (activeTab === 'sentence') {
      const sentence = item as Sentence
      setEditForm({
        text: sentence.text,
        translation: sentence.translation || '',
        word: '',
        phoneticUS: ''
      })
    } else {
      const word = item as Word
      setEditForm({
        text: '',
        translation: word.translation,
        word: word.word,
        phoneticUS: word.phoneticUS
      })
    }
    setEditDialogOpen(true)
  }

  const handleDelete = (item: Sentence | Word) => {
    setDeleteItem(item)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!deleteItem) return

    try {
      const url = activeTab === 'sentence'
        ? `/api/sentence/admin?id=${deleteItem.id}`
        : `/api/admin/word?id=${deleteItem.id}`

      const res = await fetch(url, { method: 'DELETE' })
      const data = await res.json()

      if (data.success) {
        toast.success('删除成功')
        setDeleteDialogOpen(false)
        setDeleteItem(null)
        if (activeTab === 'sentence') {
          loadSentences()
        } else {
          loadWords()
        }
      } else {
        toast.error(data.error || '删除失败')
      }
    } catch (error) {
      console.error('删除失败:', error)
      toast.error('删除失败')
    }
  }

  const handleSave = async () => {
    if (!editingItem) return

    try {
      if (activeTab === 'sentence') {
        const res = await fetch('/api/sentence/admin', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingItem.id,
            text: editForm.text,
            translation: editForm.translation || null
          })
        })
        const data = await res.json()
        if (data.success) {
          toast.success('更新成功')
          setEditDialogOpen(false)
          setEditingItem(null)
          loadSentences()
        } else {
          toast.error(data.error || '更新失败')
        }
      } else {
        const res = await fetch('/api/admin/word', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingItem.id,
            word: editForm.word,
            translation: editForm.translation,
            phoneticUS: editForm.phoneticUS
          })
        })
        const data = await res.json()
        if (data.success) {
          toast.success('更新成功')
          setEditDialogOpen(false)
          setEditingItem(null)
          loadWords()
        } else {
          toast.error(data.error || '更新失败')
        }
      }
    } catch (error) {
      console.error('保存失败:', error)
      toast.error('保存失败')
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6">

        {/* Tab切换 */}
        <div className="flex gap-4 mb-4 border-b border-gray-200 dark:border-gray-800">
          <button
            onClick={() => setActiveTab('sentence')}
            className={`pb-2 transition-colors ${
              activeTab === 'sentence'
                ? 'font-semibold border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-blue-500'
            }`}
          >
            句子
          </button>
          <button
            onClick={() => setActiveTab('word')}
            className={`pb-2 transition-colors ${
              activeTab === 'word'
                ? 'font-semibold border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-blue-500'
            }`}
          >
            单词
          </button>
        </div>

        {/* 筛选区域 */}
        <div className="flex gap-4 items-end mb-4">
          {activeTab === 'sentence' ? (
            <>
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">选择句子集</label>
                <Select
                  value={selectedSentenceSetId?.toString() || ''}
                  onValueChange={(v) => {
                    setSelectedSentenceSetId(v ? Number(v) : null)
                    setPage(1)
                    setSearchText('')
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="请选择句子集" />
                  </SelectTrigger>
                  <SelectContent>
                    {sentenceSets.map(set => (
                      <SelectItem key={set.id} value={set.id.toString()}>
                        {set.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedSentenceSetId && (
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1">搜索句子内容</label>
                  <Input
                    placeholder="输入关键词搜索..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                  />
                </div>
              )}
            </>
          ) : (
            <>
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">选择单词集</label>
                <Select
                  value={selectedWordSetId?.toString() || ''}
                  onValueChange={(v) => {
                    setSelectedWordSetId(v ? Number(v) : null)
                    setPage(1)
                    setSearchText('')
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="请选择单词集" />
                  </SelectTrigger>
                  <SelectContent>
                    {wordSets.map(set => (
                      <SelectItem key={set.id} value={set.id.toString()}>
                        {set.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedWordSetId && (
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1">搜索单词内容</label>
                  <Input
                    placeholder="输入关键词搜索..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* 表格 */}
      {loading ? (
        <div className="text-center py-8">加载中...</div>
      ) : (
        <>
          {activeTab === 'sentence' ? (
            selectedSentenceSetId ? (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>序号</TableHead>
                      <TableHead>句子内容</TableHead>
                      <TableHead>翻译</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sentences.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                          暂无数据
                        </TableCell>
                      </TableRow>
                    ) : (
                      sentences.map(sentence => (
                        <TableRow key={sentence.id}>
                          <TableCell>{sentence.index}</TableCell>
                          <TableCell className="max-w-md whitespace-normal break-words">{sentence.text}</TableCell>
                          <TableCell className="max-w-md whitespace-normal break-words">{sentence.translation || '-'}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => handleEdit(sentence)}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => handleDelete(sentence)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                {total > pageSize && (
                  <div className="mt-4 flex justify-center">
                    <CustomPagination
                      currentPage={page}
                      totalPages={Math.ceil(total / pageSize)}
                      onPageChange={setPage}
                    />
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-gray-500">请先选择句子集</div>
            )
          ) : (
            selectedWordSetId ? (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>单词</TableHead>
                      <TableHead>音标</TableHead>
                      <TableHead>翻译</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {words.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                          暂无数据
                        </TableCell>
                      </TableRow>
                    ) : (
                      words.map(word => (
                        <TableRow key={word.id}>
                          <TableCell className="font-medium">{word.word}</TableCell>
                          <TableCell>{word.phoneticUS || '-'}</TableCell>
                          <TableCell className="max-w-md">{word.translation || '-'}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => handleEdit(word)}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => handleDelete(word)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                {total > pageSize && (
                  <div className="mt-4 flex justify-center">
                    <CustomPagination
                      currentPage={page}
                      totalPages={Math.ceil(total / pageSize)}
                      onPageChange={setPage}
                    />
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-gray-500">请先选择单词集</div>
            )
          )}
        </>
      )}

      {/* 编辑弹窗 */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>编辑{activeTab === 'sentence' ? '句子' : '单词'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {activeTab === 'sentence' ? (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1">句子内容</label>
                  <Textarea
                    value={editForm.text}
                    onChange={(e) => setEditForm(prev => ({ ...prev, text: e.target.value }))}
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">翻译</label>
                  <Textarea
                    value={editForm.translation}
                    onChange={(e) => setEditForm(prev => ({ ...prev, translation: e.target.value }))}
                    rows={3}
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1">单词</label>
                  <Input
                    value={editForm.word}
                    onChange={(e) => setEditForm(prev => ({ ...prev, word: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">音标</label>
                  <Input
                    value={editForm.phoneticUS}
                    onChange={(e) => setEditForm(prev => ({ ...prev, phoneticUS: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">翻译</label>
                  <Textarea
                    value={editForm.translation}
                    onChange={(e) => setEditForm(prev => ({ ...prev, translation: e.target.value }))}
                    rows={3}
                  />
                </div>
              </>
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>取消</Button>
              <Button onClick={handleSave}>保存</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 删除确认弹窗 */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              确定要删除这条{activeTab === 'sentence' ? '句子' : '单词'}吗？此操作不可恢复。
            </p>
            {deleteItem && (
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded text-sm">
                {activeTab === 'sentence'
                  ? (deleteItem as Sentence).text
                  : (deleteItem as Word).word
                }
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>取消</Button>
              <Button variant="destructive" onClick={confirmDelete}>确认删除</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
