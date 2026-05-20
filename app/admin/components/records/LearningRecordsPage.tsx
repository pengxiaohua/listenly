'use client'

import { useEffect, useState, useCallback } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { CustomPagination } from '@/components/ui/pagination'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { BookOpen, Search } from 'lucide-react'
import dayjs from 'dayjs'

type RecordType = 'word' | 'sentence' | 'shadowing' | 'video'

interface WordRecordItem {
  id: string
  userId: string
  userName: string
  isCorrect: boolean
  errorCount: number
  isMastered: boolean
  createdAt: string
  word: string
  translation: string
  setName: string
}

interface SentenceRecordItem {
  id: number
  userId: string
  userName: string
  isCorrect: boolean
  errorCount: number
  isMastered: boolean
  createdAt: string
  sentence: string
  translation: string
  setName: string
}

interface ShadowingRecordItem {
  id: number
  userId: string
  userName: string
  score: number | null
  shadowingSentence: string | null
  createdAt: string
  text: string
  translation: string | null
  setName: string
}

interface VideoRecordItem {
  id: number
  userId: string
  userName: string
  videoId: number
  playedSeconds: number
  activeSeconds: number
  createdAt: string
  videoTitle: string
  videoTitleZh: string
}

const tabs: { key: RecordType; label: string }[] = [
  { key: 'word', label: '单词' },
  { key: 'sentence', label: '句子' },
  { key: 'shadowing', label: '跟读' },
  { key: 'video', label: '视频' },
]

export default function LearningRecordsPage() {
  const [type, setType] = useState<RecordType>('word')
  const [records, setRecords] = useState<(WordRecordItem | SentenceRecordItem | ShadowingRecordItem | VideoRecordItem)[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [userId, setUserId] = useState('')
  const [inputValue, setInputValue] = useState('')
  const pageSize = 20

  const loadRecords = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        type,
      })
      if (userId) params.set('userId', userId)
      const res = await fetch(`/api/admin/learning-records?${params}`)
      const data = await res.json()
      if (data.records) {
        setRecords(data.records)
        setTotal(data.total)
      } else {
        toast.error('加载学习记录失败')
      }
    } catch (error) {
      console.error('加载学习记录失败:', error)
      toast.error('加载学习记录失败')
    } finally {
      setLoading(false)
    }
  }, [page, type, userId])

  useEffect(() => {
    loadRecords()
  }, [loadRecords])

  const handleSearch = () => {
    setUserId(inputValue.trim())
    setPage(1)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch()
  }

  const handleTabChange = (t: RecordType) => {
    setType(t)
    setPage(1)
  }

  const formatDate = (dateString: string) => dayjs(dateString).format('YYYY/MM/DD HH:mm')

  const formatSeconds = (seconds: number) => {
    if (seconds < 60) return `${seconds}秒`
    const min = Math.floor(seconds / 60)
    const sec = seconds % 60
    return sec > 0 ? `${min}分${sec}秒` : `${min}分钟`
  }

  const renderTable = () => {
    if (type === 'word') {
      const items = records as WordRecordItem[]
      return (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>用户ID</TableHead>
              <TableHead>用户名</TableHead>
              <TableHead>单词</TableHead>
              <TableHead>释义</TableHead>
              <TableHead>所属集合</TableHead>
              <TableHead>是否正确</TableHead>
              <TableHead>错误次数</TableHead>
              <TableHead>已掌握</TableHead>
              <TableHead>时间</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map(r => (
              <TableRow key={r.id}>
                <TableCell className="text-xs font-mono">{r.userId}</TableCell>
                <TableCell className="text-sm">{r.userName}</TableCell>
                <TableCell className="font-medium">{r.word}</TableCell>
                <TableCell className="text-sm text-slate-600 max-w-[200px] truncate">{r.translation}</TableCell>
                <TableCell className="text-sm">{r.setName}</TableCell>
                <TableCell>
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${r.isCorrect ? 'text-green-600 bg-green-50 border-green-200' : 'text-red-600 bg-red-50 border-red-200'}`}>
                    {r.isCorrect ? '正确' : '错误'}
                  </span>
                </TableCell>
                <TableCell className="text-sm">{r.errorCount}</TableCell>
                <TableCell>
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${r.isMastered ? 'text-indigo-600 bg-indigo-50 border-indigo-200' : 'text-slate-500 bg-slate-50 border-slate-200'}`}>
                    {r.isMastered ? '已掌握' : '未掌握'}
                  </span>
                </TableCell>
                <TableCell className="text-sm">{formatDate(r.createdAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )
    }

    if (type === 'sentence') {
      const items = records as SentenceRecordItem[]
      return (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>用户ID</TableHead>
              <TableHead>用户名</TableHead>
              <TableHead>句子</TableHead>
              <TableHead>所属集合</TableHead>
              <TableHead>是否正确</TableHead>
              <TableHead>错误次数</TableHead>
              <TableHead>已掌握</TableHead>
              <TableHead>时间</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map(r => (
              <TableRow key={r.id}>
                <TableCell className="text-xs font-mono">{r.userId}</TableCell>
                <TableCell className="text-sm">{r.userName}</TableCell>
                <TableCell className="text-sm max-w-[300px] truncate" title={r.sentence}>{r.sentence}</TableCell>
                <TableCell className="text-sm">{r.setName}</TableCell>
                <TableCell>
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${r.isCorrect ? 'text-green-600 bg-green-50 border-green-200' : 'text-red-600 bg-red-50 border-red-200'}`}>
                    {r.isCorrect ? '正确' : '错误'}
                  </span>
                </TableCell>
                <TableCell className="text-sm">{r.errorCount}</TableCell>
                <TableCell>
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${r.isMastered ? 'text-indigo-600 bg-indigo-50 border-indigo-200' : 'text-slate-500 bg-slate-50 border-slate-200'}`}>
                    {r.isMastered ? '已掌握' : '未掌握'}
                  </span>
                </TableCell>
                <TableCell className="text-sm">{formatDate(r.createdAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )
    }

    if (type === 'shadowing') {
      const items = records as ShadowingRecordItem[]
      return (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>用户ID</TableHead>
              <TableHead>用户名</TableHead>
              <TableHead>跟读内容</TableHead>
              <TableHead>所属集合</TableHead>
              <TableHead>评分</TableHead>
              <TableHead>时间</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map(r => (
              <TableRow key={r.id}>
                <TableCell className="text-xs font-mono">{r.userId}</TableCell>
                <TableCell className="text-sm">{r.userName}</TableCell>
                <TableCell className="text-sm max-w-[300px] truncate" title={r.text}>{r.text}</TableCell>
                <TableCell className="text-sm">{r.setName}</TableCell>
                <TableCell>
                  {r.score !== null ? (
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${r.score >= 80 ? 'text-green-600 bg-green-50 border-green-200' : r.score >= 60 ? 'text-orange-600 bg-orange-50 border-orange-200' : 'text-red-600 bg-red-50 border-red-200'}`}>
                      {r.score}分
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">无评分</span>
                  )}
                </TableCell>
                <TableCell className="text-sm">{formatDate(r.createdAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )
    }

    if (type === 'video') {
      const items = records as VideoRecordItem[]
      return (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>用户ID</TableHead>
              <TableHead>用户名</TableHead>
              <TableHead>视频标题</TableHead>
              <TableHead>中文标题</TableHead>
              <TableHead>播放时长</TableHead>
              <TableHead>活跃时长</TableHead>
              <TableHead>时间</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map(r => (
              <TableRow key={r.id}>
                <TableCell className="text-xs font-mono">{r.userId}</TableCell>
                <TableCell className="text-sm">{r.userName}</TableCell>
                <TableCell className="text-sm max-w-[250px] truncate" title={r.videoTitle}>{r.videoTitle}</TableCell>
                <TableCell className="text-sm max-w-[200px] truncate">{r.videoTitleZh || '-'}</TableCell>
                <TableCell className="text-sm">{formatSeconds(r.playedSeconds)}</TableCell>
                <TableCell className="text-sm">{formatSeconds(r.activeSeconds)}</TableCell>
                <TableCell className="text-sm">{formatDate(r.createdAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )
    }

    return null
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">学习记录</h2>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入用户ID筛选..."
              className="pl-8 w-60"
            />
          </div>
          <button
            onClick={handleSearch}
            className="cursor-pointer px-3 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
          >
            搜索
          </button>
          {userId && (
            <button
              onClick={() => { setUserId(''); setInputValue(''); setPage(1) }}
              className="cursor-pointer px-3 py-2 text-sm border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
            >
              清除
            </button>
          )}
        </div>
      </div>

      {/* 子 Tab */}
      <div className="flex gap-2 mb-4">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => handleTabChange(t.key)}
            className={`cursor-pointer px-4 py-1.5 text-sm rounded-full transition-colors ${
              type === t.key
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {userId && (
        <div className="mb-4 text-sm text-slate-500">
          当前筛选用户：<span className="font-mono text-indigo-600">{userId}</span>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8">加载中...</div>
      ) : records.length === 0 ? (
        <div className="bg-slate-100 dark:bg-slate-800 p-8 rounded-lg text-center">
          <BookOpen className="w-16 h-16 mx-auto mb-4 text-slate-400" />
          <p className="text-slate-600 dark:text-slate-400">暂无学习记录</p>
        </div>
      ) : (
        <>
          <div className="border rounded-lg overflow-hidden">
            {renderTable()}
          </div>

          <div className="mt-4 flex items-center justify-between">
            <span className="text-sm text-slate-500">共 {total} 条记录</span>
            {total > pageSize && (
              <CustomPagination
                currentPage={page}
                totalPages={Math.ceil(total / pageSize)}
                onPageChange={setPage}
              />
            )}
          </div>
        </>
      )}
    </div>
  )
}
