'use client'

import { useState, useEffect } from 'react'
import StudyHeatmap from "./StudyHeatmap"
import { formatTimeAgo } from '@/lib/timeUtils'
import { useRouter } from 'next/navigation'
import {
  BookOpen,
  AlertCircle,
  BarChart3,
  Clock,
  ChevronRight,
  TrendingUp,
  CheckCircle2,
  XCircle,
  BookMarked,
  Calendar,
  Award,
  Mic,
  WholeWord,
  NotebookText
} from 'lucide-react'

interface UserStats {
  vocabulary: {
    wordCount: number
    sentenceCount: number
  }
  wrongWords: {
    wordCount: number
    sentenceCount: number
  }
  learning: {
    wordSpellingCount: number
    sentenceDictationCount: number
    shadowingCount: number
  }
}

interface RecentLearningItem {
  type: 'word' | 'sentence' | 'shadowing'
  category: string
  categoryName: string
  lastAttempt: string
  totalCount: number
  correctCount: number
  id?: number
  slug?: string
  avgScore?: number
}

const HomePage = () => {
  const [stats, setStats] = useState<UserStats | null>(null)
  const [recentLearning, setRecentLearning] = useState<RecentLearningItem[]>([])
  const [loading, setLoading] = useState(true)

  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsResponse, recentResponse] = await Promise.all([
          fetch('/api/user/vocabulary-stats'),
          fetch('/api/user/recent-learning')
        ])

        if (statsResponse.ok) {
          const statsData = await statsResponse.json()
          setStats(statsData.data)
        }

        if (recentResponse.ok) {
          const recentData = await recentResponse.json()
          setRecentLearning(recentData.data)
        }
      } catch (error) {
        console.error('获取数据失败:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const StatCard = ({
    title,
    icon: Icon,
    stats,
    color = "blue",
    onClick
  }: {
    title: string
    icon: React.ComponentType<{ className?: string }>
    stats: { wordCount: number, sentenceCount: number }
    color?: string
    onClick?: () => void
  }) => {
    const colorClasses = {
      blue: "text-blue-500 bg-blue-50 dark:bg-blue-950/20",
      red: "text-red-500 bg-red-50 dark:bg-red-950/20",
      green: "text-green-500 bg-green-50 dark:bg-green-950/20"
    }

    return (
      <div
        className={`p-4 bg-card rounded-xl border border-border hover:shadow-md transition-all duration-200 cursor-pointer group ${onClick ? 'hover:scale-[1.02]' : ''
          }`}
        onClick={onClick}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${colorClasses[color as keyof typeof colorClasses]}`}>
              <Icon className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          </div>
          {onClick && (
            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          )}
        </div>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-1">
            <WholeWord className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">单词</span>
            <span className={`text-sm font-medium ${color === 'blue' ? 'text-blue-600' : color === 'red' ? 'text-red-600' : 'text-green-600'}`}>
              {loading ? '...' : stats.wordCount}
            </span>
            <span className="text-sm text-muted-foreground">个</span>
          </div>
          <div className="flex items-center gap-1">
            <NotebookText className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">句子</span>
            <span className={`text-sm font-medium ${color === 'blue' ? 'text-blue-600' : color === 'red' ? 'text-red-600' : 'text-green-600'}`}>
              {loading ? '...' : stats.sentenceCount}
            </span>
            <span className="text-sm text-muted-foreground">个</span>
          </div>
        </div>
        {onClick && (
          <div className="text-sm text-blue-500 mt-2 w-full text-right">
            查看详情
          </div>
        )}
      </div>
    )
  }

  const LearningRecordCard = () => (
    <div className="p-4 bg-card rounded-xl border border-border relative">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/20">
          <BarChart3 className="w-5 h-5 text-purple-500" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">学习记录</h3>
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <WholeWord className="w-4 h-4 text-blue-500" />
            <span className="text-sm text-muted-foreground">单词拼写</span>
          </div>
          <span className="text-sm font-medium text-blue-600">
            {loading ? '...' : stats?.learning.wordSpellingCount || 0} 个
          </span>
        </div>
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <NotebookText className="w-4 h-4 text-green-500" />
            <span className="text-sm text-muted-foreground">句子听写</span>
          </div>
          <span className="text-sm font-medium text-green-600">
            {loading ? '...' : stats?.learning.sentenceDictationCount || 0} 个
          </span>
        </div>
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <Mic className="w-4 h-4 text-purple-500" />
            <span className="text-sm text-muted-foreground">影子跟读</span>
          </div>
          <span className="text-sm font-medium text-purple-600">
            {loading ? '...' : stats?.learning.shadowingCount || 0} 次
          </span>
        </div>
        {/* <div className='text-sm text-blue-500 cursor-pointer absolute right-4 bottom-4' onClick={() => {
          router.push('/my?tab=records')
        }}>查看全部</div> */}
      </div>
    </div>
  )

  const RecentLearningCard = () => (
    <div className="p-4 bg-card rounded-xl border border-border">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-950/20">
          <Clock className="w-5 h-5 text-orange-500" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">最近学习</h3>
      </div>
      <div className="space-y-3">
        {loading ? (
          <div className="text-muted-foreground text-center py-4">加载中...</div>
        ) : recentLearning.length > 0 ? (
          recentLearning.map((item, index) => {
            const accuracy = item.type !== 'shadowing' && item.totalCount > 0
              ? Math.round((item.correctCount / item.totalCount) * 100)
              : null
            const isHighAccuracy = typeof accuracy === 'number' && accuracy >= 80

            return (
              <div
                key={`${item.type}-${item.category}-${index}`}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group"
                onClick={() => {
                  if (item.type === 'word') {
                    // 单词页面需要根据category找到对应的单词分类名称
                    router.push(`/word?id=${item.category}`);
                    } else if (item.type === 'sentence') {
                      // 句子页面需要根据category找到对应的corpusId
                      router.push(`/sentence?slug=${item.slug}`);
                    } else if (item.type === 'shadowing') {
                      router.push(`/shadowing?set=${item.slug}`)
                    }
                }}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-1 text-xs rounded-full font-medium flex items-center gap-1 ${item.type === 'word'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300'
                        : item.type === 'sentence'
                          ? 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-300'
                          : 'bg-purple-100 text-purple-700 dark:bg-purple-950/30 dark:text-purple-300'
                      }`}>
                      {item.type === 'word' && (
                        <>
                          <WholeWord className="w-4 h-4" />
                          单词
                        </>
                      )}
                      {item.type === 'sentence' && (
                        <>
                          <NotebookText className="w-3 h-3" />
                          句子
                        </>
                      )}
                      {item.type === 'shadowing' && (
                        <>
                          <Mic className="w-3 h-3" />
                          跟读
                        </>
                      )}
                    </span>
                    <span className="text-sm font-medium text-foreground">
                      {item.categoryName}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>{formatTimeAgo(new Date(item.lastAttempt))}</span>
                    </div>
                    <span>·</span>
                    <div className="flex items-center gap-1">
                      <Award className="w-3 h-3" />
                      <span>{item.type === 'shadowing' ? `跟读 ${item.totalCount} 次` : `已学 ${item.totalCount} 个`}</span>
                    </div>
                    {item.type === 'shadowing' && typeof item.avgScore === 'number' && (
                      <>
                        <span>·</span>
                        <div className="flex items-center gap-1">
                          <div className={`flex items-center gap-1 ${Math.round(item.avgScore) >= 80 ? 'text-green-600' : Math.round(item.avgScore) >= 60 ? 'text-orange-600' : 'text-red-600'}`}>
                            <BarChart3 className="w-3 h-3" />
                            <span>平均分 {Math.round(item.avgScore)}</span>
                          </div>
                        </div>
                      </>
                    )}
                    {typeof accuracy === 'number' && (
                      <>
                        <span>·</span>
                        <div className="flex items-center gap-1">
                          {isHighAccuracy ? (
                            <CheckCircle2 className="w-3 h-3 text-green-500" />
                          ) : (
                            <XCircle className="w-3 h-3 text-orange-500" />
                          )}
                          <span className={isHighAccuracy ? 'text-green-600' : 'text-orange-600'}>
                            正确率 {accuracy}%
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
            )
          })
        ) : (
          <div className="text-muted-foreground text-center py-8">
            <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">暂无学习记录</p>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* 标题区域 */}
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">学习概览</h1>
      </div>

      {/* 主要内容区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 左侧统计卡片 */}
        <div className="lg:col-span-1 space-y-4">
          <StatCard
            title="生词本"
            icon={BookMarked}
            stats={stats?.vocabulary || { wordCount: 0, sentenceCount: 0 }}
            color="blue"
            onClick={() => {
              router.push('/my?tab=strange')

            }}
          />
          <StatCard
            title="错词本"
            icon={AlertCircle}
            stats={stats?.wrongWords || { wordCount: 0, sentenceCount: 0 }}
            color="red"
            onClick={() => {
              router.push('/my?tab=wrong')
            }}
          />
        </div>

        {/* 中间热力图 */}
        <div className="lg:col-span-2">
          <StudyHeatmap />
        </div>
      </div>

      {/* 底部区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <LearningRecordCard />
        <RecentLearningCard />
      </div>
    </div>
  )
}

export default HomePage
