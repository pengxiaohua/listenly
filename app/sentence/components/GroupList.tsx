'use client'

import { useEffect, useState } from 'react'
import { Hourglass, Clock, Users } from 'lucide-react'
import Image from 'next/image'
import { formatLastStudiedTime } from '@/lib/timeUtils'

interface SentenceSetItem {
  id: number
  name: string
  slug: string
  description?: string
  isPro: boolean
  coverImage?: string
  ossDir: string
  _count: { sentences: number }
  learnersCount?: number
}

interface GroupItem {
  id: number
  name: string
  kind: string
  order: number
  total: number
  done: number
  lastStudiedAt: string | null
  start?: number
  end?: number
}

interface GroupListProps {
  corpusSlug: string
  onSelectGroup: (slug: string, groupOrder: number) => void
}

export default function GroupList({ corpusSlug, onSelectGroup }: GroupListProps) {
  const [selectedSentenceSet, setSelectedSentenceSet] = useState<SentenceSetItem | null>(null)
  const [sentenceGroups, setSentenceGroups] = useState<GroupItem[]>([])

  // 从URL参数初始化分组
  useEffect(() => {
    if (!corpusSlug) return

    // 设置选中的句子集
    fetch(`/api/sentence/sentence-set`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          const found = data.data.find((s: SentenceSetItem) => s.slug === corpusSlug)
          if (found) setSelectedSentenceSet(found)
        }
      })
      .catch(() => {})

    // 加载分组列表
    fetch(`/api/sentence/group?sentenceSet=${encodeURIComponent(corpusSlug)}`)
      .then(res => res.json())
      .then(res => {
        const groups = Array.isArray(res.data) ? res.data : []
        setSentenceGroups(groups)
      })
      .catch(err => console.error('加载分组失败:', err))
  }, [corpusSlug])

  // 计算虚拟分组（当没有真实分组时，按每20个一组划分）
  const virtualGroups = (() => {
    if (sentenceGroups.length > 0 || !selectedSentenceSet) return []
    const totalSentences = selectedSentenceSet._count?.sentences || 0
    if (totalSentences === 0) return []
    const groupSize = 20
    const groupCount = Math.ceil(totalSentences / groupSize)
    return Array.from({ length: groupCount }, (_, i) => {
      const start = i * groupSize + 1
      const end = Math.min((i + 1) * groupSize, totalSentences)
      const groupTotal = end - start + 1
      return {
        id: -(i + 1), // 使用负数作为虚拟ID
        name: `第${i + 1}组`,
        kind: 'SIZE',
        order: i + 1,
        total: groupTotal,
        done: 0, // 虚拟分组无法获取真实进度，显示为0
        lastStudiedAt: null,
        start, // 添加起始序号
        end, // 添加结束序号
      } as GroupItem
    })
  })()

  // 合并真实分组和虚拟分组
  const displayGroups = sentenceGroups.length > 0 ? sentenceGroups : virtualGroups

  return (
    <>
      {/* 选择了集合：在分组列表页顶部展示集合详情 */}
      {corpusSlug && selectedSentenceSet && (
        <div className="my-4 p-4 border rounded-lg bg-white dark:bg-gray-900 flex items-center gap-4">
          <div className="w-22 h-30 rounded overflow-hidden flex-shrink-0 bg-gradient-to-br from-blue-400 to-purple-500">
            {selectedSentenceSet.coverImage ? (
              <Image width={96} height={96} src={(selectedSentenceSet.coverImage || '').trim()} alt={selectedSentenceSet.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white text-sm font-bold px-2 text-center">
                {selectedSentenceSet.name || corpusSlug}
              </div>
            )}
          </div>
          <div className="flex-1">
            <div className="text-2xl font-semibold">{selectedSentenceSet.name || corpusSlug}</div>
            <div className="text-base text-gray-500 mt-1 flex gap-4 flex-wrap">
              <span>共 {displayGroups.length} 组</span>
              <span>句子数：{selectedSentenceSet._count?.sentences ?? displayGroups.reduce((s, g) => s + g.total, 0)}</span>
              <span>总进度：{
                (() => { const done = displayGroups.reduce((s, g) => s + g.done, 0); const total = displayGroups.reduce((s, g) => s + g.total, 0); return `${done}/${total || 0}` })()
              }</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-sm flex items-center text-gray-500">
                <Users className='w-4 h-4' />
                <span className='ml-1'>{selectedSentenceSet.learnersCount ?? 0}人</span>
              </div>
              {
                selectedSentenceSet.isPro ?
                  <span className="text-xs border bg-orange-600 text-white rounded-full px-3 py-1 flex items-center justify-center">会员</span>
                  : <span className="text-xs border bg-green-600 text-white rounded-full px-3 py-1 flex items-center justify-center">免费</span>
              }
            </div>
            {selectedSentenceSet.description && (
              <div className="text-sm text-gray-600 mt-1 line-clamp-2">{selectedSentenceSet.description}</div>
            )}
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        {displayGroups.map((g: GroupItem) => {
          const isVirtual = g.id < 0
          const displayText = g.kind === 'SIZE' || isVirtual
            ? (() => {
                if (isVirtual && g.start && g.end) {
                  return `${g.start}-${g.end}`
                }
                const idx = displayGroups.findIndex(gg => gg.id === g.id)
                const prevTotal = idx > 0 ? displayGroups.slice(0, idx).reduce((s, gg) => s + gg.total, 0) : 0
                const start = prevTotal + 1
                const end = start + g.total - 1
                return `${start}-${end}`
              })()
            : <>第{g.order}组</>
          return (
            <button key={g.id}
              onClick={() => onSelectGroup(corpusSlug, g.order)}
              className="text-left p-4 border rounded hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
              <div className="text-2xl font-semibold">{g.name}</div>
              <div className="text-base text-gray-500 mt-1">
                {displayText}
              </div>
              <div className='flex gap-4'>
                <div className="text-base text-gray-500 mt-1 flex items-center">
                  <Hourglass className='w-4 h-4' />
                  <span className='ml-1'>{g.done}/{g.total}</span>
                </div>
                {!isVirtual && (
                  <div className="text-base text-gray-500 mt-1 flex items-center">
                    <Clock className='w-4 h-4' />
                    <span className='ml-1'>{formatLastStudiedTime(g.lastStudiedAt)}</span>
                  </div>
                )}
                {g.done >= g.total && (
                  <div className="text-xs border bg-green-500 text-white rounded-full px-3 py-1 flex items-center justify-center">
                    已完成
                  </div>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </>
  )
}

