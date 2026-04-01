'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
// import { useRouter } from 'next/navigation'
import { Users, Target, Baseline, NotebookText } from 'lucide-react'
import Image from 'next/image'
import Empty from '@/components/common/Empty'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import SortFilter, { type SortType } from '@/components/common/SortFilter'
import CourseFilter, { type LevelType, type ProFilterType } from '@/components/common/CourseFilter'
import LevelBadge from '@/components/common/LevelBadge'
import { FeedbackDialog } from '@/components/common/FeedbackDialog'
import { LiquidTabs } from '@/components/ui/liquid-tabs'
import { useUserConfigStore } from '@/store/userConfig'
import { useIsMobile } from '@/lib/useIsMobile'

interface CatalogFirst { id: number; name: string; slug: string; seconds: CatalogSecond[] }
interface CatalogSecond { id: number; name: string; slug: string; thirds: CatalogThird[] }
interface CatalogThird { id: number; name: string; slug: string }
interface SentenceSetItem {
  id: number
  name: string
  slug: string
  description?: string
  isPro: boolean
  level?: string
  coverImage?: string
  ossDir: string
  _count: { sentences: number, done: number }
  learnersCount?: number
  createdTime?: string
  lastStudiedAt?: string | null
}

interface SentenceSetSelectorProps {
  onSelectSet: (slug: string) => void
}

export default function SentenceSetSelector({ onSelectSet }: SentenceSetSelectorProps) {
  // const router = useRouter()
  const isMobile = useIsMobile()
  const [catalogs, setCatalogs] = useState<CatalogFirst[]>([])
  const [selectedFirstId, setSelectedFirstId] = useState<string>('ALL')
  const [selectedSecondId, setSelectedSecondId] = useState<string>('')
  const [selectedThirdId, setSelectedThirdId] = useState<string>('')
  const [sentenceSets, setSentenceSets] = useState<SentenceSetItem[]>([])
  const [isSentenceSetsLoading, setIsSentenceSetsLoading] = useState(false)
  const [sortBy, setSortBy] = useState<SortType>('popular')
  const [filterLevels, setFilterLevels] = useState<LevelType[]>([])
  const [filterPro, setFilterPro] = useState<ProFilterType[]>([])
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [reviewCount, setReviewCount] = useState(0)
  const [vocabReviewCount, setVocabReviewCount] = useState(0)
  const showReviewEntries = useUserConfigStore(state => state.config.learning.showReviewEntries) ?? false

  // 加载错题数量
  useEffect(() => {
    fetch('/api/sentence/review?limit=1')
      .then(res => res.json())
      .then(data => {
        if (data) setReviewCount(data.total || 0)
      })
      .catch(err => console.error('加载错题数量失败:', err))
  }, [])

  // 加载生词本句子数量
  useEffect(() => {
    fetch('/api/vocabulary/sentence-review?limit=1')
      .then(res => res.json())
      .then(data => {
        if (data) setVocabReviewCount(data.total || 0)
      })
      .catch(err => console.error('加载生词本句子数量失败:', err))
  }, [])

  // 加载目录树
  useEffect(() => {
    fetch('/api/catalog')
      .then(res => res.json())
      .then(data => {
        if (data.success) setCatalogs(data.data)
      })
      .catch(err => console.error('加载目录失败:', err))
  }, [])

  // 提取标题的排序键（与单词页面保持一致）
  const getSortKey = useCallback((name: string) => {
    if (!name) return { num: null, char: '' }

    // 跳过开头的符号，找到第一个有效字符
    let startIdx = 0
    while (startIdx < name.length && /[^\w\u4e00-\u9fa5]/.test(name[startIdx])) {
      startIdx++
    }

    // 提取开头的数字（如果有）
    const numMatch = name.slice(startIdx).match(/^\d+/)
    const num = numMatch ? parseInt(numMatch[0], 10) : null

    // 找到第一个中文或英文字母
    let charIdx = startIdx
    if (numMatch) {
      charIdx = startIdx + numMatch[0].length
    }

    // 跳过数字后的符号，找到第一个中文或英文字母
    while (charIdx < name.length && /[^\w\u4e00-\u9fa5]/.test(name[charIdx])) {
      charIdx++
    }

    const char = charIdx < name.length ? name[charIdx] : ''

    return { num, char }
  }, [])

  // 排序句子集列表
  const sortSentenceSets = useCallback((sets: SentenceSetItem[], sortType: SortType) => {
    const sorted = [...sets]
    switch (sortType) {
      case 'popular':
        // 最受欢迎：根据 learnersCount 从大到小排序
        sorted.sort((a, b) => (b.learnersCount || 0) - (a.learnersCount || 0))
        break
      case 'latest':
        // 最新课程：根据 createdTime 由近及远排序
        sorted.sort((a, b) => {
          if (!a.createdTime) return 1
          if (!b.createdTime) return -1
          return new Date(b.createdTime).getTime() - new Date(a.createdTime).getTime()
        })
        break
      case 'name':
        // 标题排序：智能排序规则
        sorted.sort((a, b) => {
          const keyA = getSortKey(a.name)
          const keyB = getSortKey(b.name)

          // 如果都有数字，先按数字从小到大排序
          if (keyA.num !== null && keyB.num !== null) {
            if (keyA.num !== keyB.num) {
              return keyA.num - keyB.num
            }
          }
          // 如果只有一个有数字，有数字的在前
          else if (keyA.num !== null) {
            return -1
          }
          else if (keyB.num !== null) {
            return 1
          }

          // 数字相同或都没有数字时，按字符排序
          return keyA.char.localeCompare(keyB.char, 'zh-CN')
        })
        break
    }
    return sorted
  }, [getSortKey])

  const lastStudiedSlug = useMemo(() => {
    const withDate = sentenceSets.filter(s => s.lastStudiedAt)
    if (withDate.length === 0) return null
    withDate.sort((a, b) => new Date(b.lastStudiedAt!).getTime() - new Date(a.lastStudiedAt!).getTime())
    return withDate[0].slug
  }, [sentenceSets])

  // 根据目录筛选加载句子集
  useEffect(() => {
    const params = new URLSearchParams()
    if (selectedFirstId && selectedFirstId !== 'ALL') params.set('catalogFirstId', selectedFirstId)
    if (selectedSecondId) params.set('catalogSecondId', selectedSecondId)
    if (selectedThirdId) params.set('catalogThirdId', selectedThirdId)

    setIsSentenceSetsLoading(true)
    fetch(`/api/sentence/sentence-set?${params.toString()}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          const sorted = sortSentenceSets(data.data, sortBy)
          setSentenceSets(sorted)
        }
      })
      .catch(err => console.error('加载句子集失败:', err))
      .finally(() => setIsSentenceSetsLoading(false))
  }, [selectedFirstId, selectedSecondId, selectedThirdId, sortBy, sortSentenceSets])

  // 当排序方式改变时，重新排序已加载的句子集
  useEffect(() => {
    if (sentenceSets.length > 0) {
      const sorted = sortSentenceSets(sentenceSets, sortBy)
      setSentenceSets(sorted)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy, sortSentenceSets])

  // 获取可选的二级目录
  const availableSeconds = selectedFirstId && selectedFirstId !== 'ALL'
    ? catalogs.find(c => c.id === parseInt(selectedFirstId))?.seconds || []
    : []

  // 获取可选的三级目录
  const availableThirds = selectedSecondId && selectedSecondId !== 'NONE'
    ? availableSeconds.find(s => s.id === parseInt(selectedSecondId))?.thirds || []
    : []

  return (
    <>
    <div className="mb-4">
      {/* 顶部级联筛选导航 */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="container mx-auto py-3 relative">
          {/* 筛选条件 */}
          <div className="absolute top-3 right-0 flex items-center gap-1 md:gap-2">
            <button onClick={() => setFeedbackOpen(true)} className="text-sm text-indigo-500 hover:text-indigo-600 hover:underline cursor-pointer hidden md:block">没找到想要的课程？</button>
            <CourseFilter
              selectedLevels={filterLevels}
              selectedProFilters={filterPro}
              onLevelsChange={setFilterLevels}
              onProFiltersChange={setFilterPro}
              size={isMobile ? 'sm' : 'md'}
            />
            <SortFilter sortBy={sortBy} onSortChange={setSortBy} size={isMobile ? 'sm' : 'md'} className="hidden md:block" />
          </div>
          {/* 一级目录 */}
          <div>
            <LiquidTabs
              items={[
                { value: 'ALL', label: '全部' },
                ...catalogs.map(cat => ({ value: String(cat.id), label: cat.name }))
              ]}
              value={selectedFirstId}
              onValueChange={(value) => {
                setSelectedFirstId(value)
                setSelectedSecondId('')
                setSelectedThirdId('')
              }}
              size={isMobile ? 'sm' : 'md'}
              align="left"
              className="overflow-x-auto"
              id='first'
            />
          </div>

          {/* 二级目录 */}
          {selectedFirstId && availableSeconds.length > 0 && (
            <div className="mt-2">
              <LiquidTabs
                items={[
                  { value: '', label: '全部' },
                  ...availableSeconds.map(cat => ({ value: String(cat.id), label: cat.name }))
                ]}
                value={selectedSecondId || ''}
                onValueChange={(value) => {
                  setSelectedSecondId(value)
                  setSelectedThirdId('')
                }}
                size="sm"
                align="left"
                className="overflow-x-auto"
                id="second"
              />
            </div>
          )}

          {/* 三级目录 */}
          {selectedSecondId && availableThirds.length > 0 && (
            <div className="mt-2">
              <LiquidTabs
                items={[
                  { value: '', label: '全部' },
                  ...availableThirds.map(cat => ({ value: String(cat.id), label: cat.name }))
                ]}
                value={selectedThirdId || ''}
                onValueChange={setSelectedThirdId}
                size="sm"
                align="left"
                className="overflow-x-auto"
                id="third"
              />
            </div>
          )}
        </div>
      </div>

      {/* 句子课程包列表 */}
      {isSentenceSetsLoading ? (
        <div className="flex flex-wrap gap-2 sm:gap-4 md:gap-3 mt-4">
          {Array.from({ length: 12 }).map((_, idx) => (
            <div
              key={`sentence-set-skeleton-${idx}`}
              className="w-[calc(50%-0.25rem)] sm:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.6666rem)] xl:w-[calc(25%-0.8333rem)] 2xl:p-4 p-2 sm:p-3 bg-white dark:bg-slate-800 rounded-xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-700"
            >
              <div className="flex h-full">
                <Skeleton className="w-[56px] h-[79px] sm:w-[105px] sm:h-[148px] rounded-lg mr-1.5 sm:mr-3 3xl:mr-4 flex-shrink-0" />
                <div className="flex-1 flex flex-col justify-between min-w-0">
                  <div>
                    <Skeleton className="h-4 sm:h-5 w-4/5 mb-2 sm:mb-3" />
                    <Skeleton className="h-3 sm:h-4 w-10 sm:w-14" />
                    <div className="mt-1.5 sm:mt-2">
                      <Skeleton className="h-4 sm:h-6 w-10 sm:w-14 rounded-full" />
                    </div>
                  </div>
                  <div>
                    <Skeleton className="h-3 sm:h-4 w-16 sm:w-28 mb-1" />
                    <Skeleton className="w-full h-1.5 sm:h-2" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : sentenceSets.length > 0 ? (
        <div className="flex flex-wrap gap-2 sm:gap-4 md:gap-3 mt-4 px-2 sm:px-0">
          {/* 错词本复习入口 - 仅在"全部"分类下显示 */}
          {showReviewEntries && selectedFirstId === 'ALL' && reviewCount > 0 && (
            <div
              onClick={() => onSelectSet('review-mode')}
              className="course-card w-[calc(50%-0.25rem)] sm:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.6666rem)] xl:w-[calc(25%-0.8333rem)] 2xl:p-4 p-2 sm:p-3 bg-white dark:bg-slate-800 rounded-xl shadow-sm cursor-pointer border border-slate-200 dark:border-slate-700 group"
            >
              <div className="flex h-full">
                <div className="relative w-[56px] h-[79px] sm:w-[105px] sm:h-[148px] rounded-lg mr-1.5 sm:mr-3 3xl:mr-4 flex-shrink-0 bg-gradient-to-br from-rose-400 to-orange-500 flex items-center justify-center">
                  <div className="text-white text-center">
                    <Target className="w-5 h-5 sm:w-8 sm:h-8 mx-auto mb-0.5 sm:mb-2" />
                    <div className="font-bold text-[10px] sm:text-base leading-tight">错题复习</div>
                  </div>
                </div>
                <div className="flex-1 flex flex-col justify-between min-w-0">
                  <div>
                    <h3 className="font-bold text-xs sm:text-base mb-1 sm:mb-2">错题复习</h3>
                    <div className='flex items-center gap-2 sm:gap-3 text-[10px] sm:text-sm text-slate-500'>
                      <div className="flex items-center">
                        <Baseline className='w-3 h-3 sm:w-4 sm:h-4' />
                        <p className='ml-0.5 sm:ml-1'>{reviewCount} 句</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          {/* 生词本复习入口 - 仅在"全部"分类下显示 */}
          {showReviewEntries && selectedFirstId === 'ALL' && vocabReviewCount > 0 && (
            <div
              onClick={() => onSelectSet('vocab-review-mode')}
              className="course-card w-[calc(50%-0.25rem)] sm:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.6666rem)] xl:w-[calc(25%-0.8333rem)] 2xl:p-4 p-2 sm:p-3 bg-white dark:bg-slate-800 rounded-xl shadow-sm cursor-pointer border border-slate-200 dark:border-slate-700 group"
            >
              <div className="flex h-full">
                <div className="relative w-[56px] h-[79px] sm:w-[105px] sm:h-[148px] rounded-lg mr-1.5 sm:mr-3 3xl:mr-4 flex-shrink-0 bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center">
                  <div className="text-white text-center">
                    <Target className="w-5 h-5 sm:w-8 sm:h-8 mx-auto mb-0.5 sm:mb-2" />
                    <div className="font-bold text-[10px] sm:text-base leading-tight">生词复习</div>
                  </div>
                </div>
                <div className="flex-1 flex flex-col justify-between min-w-0">
                  <div>
                    <h3 className="font-bold text-xs sm:text-base mb-1 sm:mb-2">生词复习</h3>
                    <div className='flex items-center gap-2 sm:gap-3 text-[10px] sm:text-sm text-slate-500'>
                      <div className="flex items-center">
                        <Baseline className='w-3 h-3 sm:w-4 sm:h-4' />
                        <p className='ml-0.5 sm:ml-1'>{vocabReviewCount} 句</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          {sentenceSets
            .filter(s => {
              if (filterPro.length > 0) {
                const match = filterPro.some(f => f === 'pro' ? s.isPro : !s.isPro)
                if (!match) return false
              }
              if (filterLevels.length > 0) {
                if (!s.level || !filterLevels.includes(s.level as LevelType)) return false
              }
              return true
            })
            .sort((a, b) => {
              const aIsLast = a.slug === lastStudiedSlug ? 1 : 0
              const bIsLast = b.slug === lastStudiedSlug ? 1 : 0
              return bIsLast - aIsLast
            })
            .map((s) => (
            <div
              key={s.id}
              onClick={() => onSelectSet(s.slug)}
              className="course-card relative w-[calc(50%-0.25rem)] sm:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.6666rem)] xl:w-[calc(25%-0.8333rem)] 2xl:p-4 p-2 sm:p-3 bg-white dark:bg-slate-800 rounded-xl shadow-sm cursor-pointer border border-slate-200 dark:border-slate-700 group"
            >
              {s.slug === lastStudiedSlug && (
                <span className="absolute top-0 right-0 z-10 bg-indigo-500 text-white text-[8px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-bl-xl shadow-sm opacity-80">上次学习</span>
              )}
              <div className="flex h-full">
                {/* 课程封面 - 左侧 */}
                <div className="relative w-[56px] h-[79px] sm:w-[105px] sm:h-[148px] rounded-lg mr-1.5 sm:mr-3 3xl:mr-4 flex-shrink-0 bg-gradient-to-br from-indigo-400 to-purple-500">
                  {s.coverImage ? (
                    <Image
                      fill
                      src={(s.coverImage || '').trim()}
                      alt={s.name}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white text-[10px] sm:text-lg font-bold px-1 sm:px-4 leading-tight">
                      {s.name}
                    </div>
                  )}
                </div>
                {/* 课程信息 - 右侧 */}
                <div className="flex-1 flex flex-col justify-between min-w-0">
                  <div>
                    <h3 className="font-bold text-xs sm:text-base mb-0.5 sm:mb-2 line-clamp-2 leading-tight">{s.name}</h3>
                    <div className='flex items-center gap-1.5 sm:gap-4 text-[10px] sm:text-sm text-slate-500'>
                      <div className="flex items-center">
                        <NotebookText className='w-3 h-3 sm:w-4 sm:h-4' />
                        <p>{s._count.sentences} 句</p>
                      </div>
                      <div className="flex items-center">
                        <Users className='w-3 h-3 sm:w-4 sm:h-4' />
                        <p className='ml-1'>{s.learnersCount ?? 0}人</p>
                      </div>
                    </div>
                    <div className='mt-0.5 sm:mt-2 flex items-center gap-1'>
                      {s.isPro ? (
                        <span className="text-[9px] sm:text-xs bg-orange-600 text-white rounded-full px-1.5 py-0.5 sm:px-3 sm:py-1">
                          会员
                        </span>
                      ) : (
                        <span className="text-[9px] sm:text-xs bg-emerald-600 text-white rounded-full px-1.5 py-0.5 sm:px-3 sm:py-1">
                          免费
                        </span>
                      )}
                      <LevelBadge level={s.level} className="text-[9px] sm:text-xs px-1.5 py-[1px] sm:px-3 sm:py-[3px]" />
                    </div>
                  </div>
                  {/* 进度条 */}
                  <div>
                    <div className='text-[10px] sm:text-xs text-slate-500'>进度：{s._count.done > 0 ? `${s._count.done}/${s._count.sentences}` : '未开始'}</div>
                    {s._count.done > 0 &&
                      <div className='mt-0.5 sm:mt-1'>
                        <Progress value={s._count.done / s._count.sentences * 100} className="w-full h-1 sm:h-2" />
                      </div>
                    }
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 text-slate-400">
          <Empty text="暂无课程包" />
        </div>
      )}
    </div>
    <FeedbackDialog isOpen={feedbackOpen} onOpenChange={setFeedbackOpen} />
    </>
  )
}

