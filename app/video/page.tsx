'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Play, Lock, Eye, Clock } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

const CATEGORY_OPTIONS = [
  { value: 'ALL', label: '全部分类' },
  { value: 'PSYCHOLOGY', label: '心理学' },
  { value: 'MOVIE_TV_SERIES', label: '影视剧集' },
  { value: 'LANGUAGE_LEARNING', label: '语言学习' },
  { value: 'PERSONAL_GROWTH', label: '个人成长' },
  { value: 'CAREER_BUSINESS', label: '职场与商业' },
  { value: 'SCIENCE_TECH', label: '科学技术' },
  { value: 'HEALTHY_LIVING', label: '健康生活' },
  { value: 'SPEECH_EXPRESSION', label: '演讲表达' },
  { value: 'PHILOSOPHY_THINKING', label: '哲学与思考' },
]

const LEVEL_OPTIONS = [
  { value: 'ALL', label: '全部等级' },
  { value: 'A1', label: 'A1' },
  { value: 'A2', label: 'A2' },
  { value: 'B1', label: 'B1' },
  { value: 'B2', label: 'B2' },
  { value: 'C1', label: 'C1' },
  { value: 'C2', label: 'C2' },
]

const SORT_OPTIONS = [
  { value: 'latest', label: '最新发布' },
  { value: 'popular', label: '最受欢迎' },
]

interface VideoItem {
  id: number
  uuid: string
  title: string
  titleZh?: string
  author?: string
  description?: string
  category: string
  level?: string
  duration?: number
  tags: string[]
  coverImageUrl?: string
  isPro: boolean
  viewCount: number
  createdAt: string
}

function formatDuration(seconds?: number) {
  if (!seconds) return ''
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

function formatRelativeTime(dateStr: string) {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return '今天'
  if (diffDays === 1) return '昨天'
  if (diffDays < 30) return `${diffDays} 天前发布`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} 个月前发布`
  return `${Math.floor(diffDays / 365)} 年前发布`
}

const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  CATEGORY_OPTIONS.filter(c => c.value !== 'ALL').map(c => [c.value, c.label])
)

export default function VideoListPage() {
  const router = useRouter()
  const [videos, setVideos] = useState<VideoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('ALL')
  const [level, setLevel] = useState('ALL')
  const [sortBy, setSortBy] = useState('latest')

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (category !== 'ALL') params.set('category', category)
    if (level !== 'ALL') params.set('level', level)
    params.set('sort', sortBy)

    fetch(`/api/video?${params.toString()}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) setVideos(data.data)
      })
      .catch(err => console.error('加载视频失败:', err))
      .finally(() => setLoading(false))
  }, [category, level, sortBy])

  const filteredVideos = useMemo(() => {
    let result = [...videos]
    if (level !== 'ALL') {
      result = result.filter(v => v.level === level)
    }
    return result
  }, [videos, level])

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50">
      <div className="container mx-auto py-6 px-2 md:px-0">

        {/* 筛选栏 */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          {/* 分类筛选 */}
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          >
            {CATEGORY_OPTIONS.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>

          {/* 等级筛选 */}
          <select
            value={level}
            onChange={e => setLevel(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          >
            {LEVEL_OPTIONS.map(l => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </select>

          {/* 排序 */}
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          >
            {SORT_OPTIONS.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        {/* 视频网格 */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-xl overflow-hidden bg-white border border-gray-100">
                <Skeleton className="w-full aspect-video" />
                <div className="p-3 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredVideos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Play className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-lg">暂无视频</p>
            <p className="text-sm mt-1">请稍后再来查看</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredVideos.map(video => (
              <div
                key={video.id}
                onClick={() => router.push(`/video/${video.uuid}`)}
                className="group rounded-xl overflow-hidden bg-white border border-gray-100 hover:shadow-lg hover:border-gray-200 transition-all duration-300 cursor-pointer"
              >
                {/* 封面图 */}
                <div className="relative aspect-video bg-gray-100 overflow-hidden">
                  {video.coverImageUrl ? (
                    <Image
                      src={video.coverImageUrl}
                      alt={video.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-100 to-purple-100">
                      <Play className="w-10 h-10 text-indigo-300" />
                    </div>
                  )}

                  {/* 时长标签 */}
                  {video.duration && (
                    <span className="absolute bottom-2 left-2 bg-black/70 text-white text-[11px] px-1.5 py-0.5 rounded font-mono">
                      {formatDuration(video.duration)}
                    </span>
                  )}

                  {/* 等级标签 */}
                  {video.level && (
                    <span className="absolute top-2 left-2 bg-indigo-600/90 text-white text-[11px] px-2 py-0.5 rounded-full font-medium">
                      {video.level}
                    </span>
                  )}

                  {/* 会员标签 */}
                  {video.isPro && (
                    <span className="absolute top-2 right-2 bg-black/60 text-white text-[11px] px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Lock className="w-3 h-3" /> 需购买会员
                    </span>
                  )}

                  {/* 播放按钮 hover */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                      <Play className="w-5 h-5 text-indigo-600 bg-white/90 translate-x-0.5" />
                    </div>
                  </div>
                </div>

                {/* 信息区 */}
                <div className="p-3">
                  <h3 className="text-base font-semibold text-gray-900 line-clamp-2 leading-snug mb-1 group-hover:text-indigo-600 transition-colors">
                    {video.title}
                  </h3>
                  {video.titleZh && (
                    <p className="text-sm text-gray-600 line-clamp-1 mb-2">{video.titleZh}</p>
                  )}

                  {/* 标签 */}
                  {video.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {video.category && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100">
                          {CATEGORY_LABEL[video.category] || video.category}
                        </span>
                      )}
                      {video.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-50 text-gray-500 border border-gray-100">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* 底部信息 */}
                  <div className="flex items-center justify-between text-[11px] text-gray-400">
                    <span>{video.author || '未知作者'}</span>
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-0.5">
                        <Eye className="w-3 h-3" /> {video.viewCount}次播放
                      </span>
                      <span className="flex items-center gap-0.5">
                        <Clock className="w-3 h-3" /> {formatRelativeTime(video.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
