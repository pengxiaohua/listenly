'use client'

import { useState, useEffect } from 'react'
import StudyHeatmap from "./StudyHeatmap"
import { formatTimeAgo } from '@/lib/timeUtils'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { toast } from 'sonner'
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
  NotebookText,
  Flame,
  CalendarCheck
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

interface CheckInStatus {
  todayMinutes: number
  totalCheckIns: number
  streakDays: number
  hasCheckedInToday: boolean
  canCheckIn: boolean
}

const HomePage = () => {
  const [stats, setStats] = useState<UserStats | null>(null)
  const [recentLearning, setRecentLearning] = useState<RecentLearningItem[]>([])
  const [loading, setLoading] = useState(true)
  const [checkInStatus, setCheckInStatus] = useState<CheckInStatus | null>(null)
  const [checkingIn, setCheckingIn] = useState(false)

  const router = useRouter();

  // 获取打卡状态
  const fetchCheckInStatus = async () => {
    try {
      const response = await fetch('/api/user/checkin')
      if (response.ok) {
        const data = await response.json()
        setCheckInStatus(data.data)
      }
    } catch (error) {
      console.error('获取打卡状态失败:', error)
    }
  }

  // 打卡
  const handleCheckIn = async () => {
    if (!checkInStatus?.canCheckIn || checkingIn) return

    setCheckingIn(true)
    try {
      const response = await fetch('/api/user/checkin', {
        method: 'POST'
      })
      const data = await response.json()

      if (data.success) {
        toast.success('打卡成功！')
        setCheckInStatus(data.data)
      } else {
        toast.error(data.error || '打卡失败')
      }
    } catch (error) {
      console.error('打卡失败:', error)
      toast.error('打卡失败，请稍后重试')
    } finally {
      setCheckingIn(false)
    }
  }

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
    fetchCheckInStatus()
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

  // 打卡区域组件
  const CheckInCard = () => {
    const canCheckIn = checkInStatus?.canCheckIn
    const hasCheckedIn = checkInStatus?.hasCheckedInToday
    const todayMinutes = checkInStatus?.todayMinutes || 0

    return (
      <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-xl border border-blue-200 dark:border-blue-800 relative">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
            <CalendarCheck className="w-5 h-5 text-blue-500" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">每日打卡</h3>
        </div>

        <div className="flex items-center justify-between">
          {/* 左侧统计信息 */}
          <div className="flex gap-4">
            <div className="flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-500" />
              <span className="text-sm text-muted-foreground">累计打卡</span>
              <span className="text-sm font-semibold text-amber-600">
                {checkInStatus?.totalCheckIns || 0}
              </span>
              <span className="text-sm text-muted-foreground">次</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-orange-500" />
              <span className="text-sm text-muted-foreground">连续打卡</span>
              <span className="text-sm font-semibold text-orange-600">
                {checkInStatus?.streakDays || 0}
              </span>
              <span className="text-sm text-muted-foreground">天</span>
            </div>
          </div>

          {/* 右侧打卡按钮 */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <Button
                  onClick={handleCheckIn}
                  disabled={!canCheckIn || checkingIn || hasCheckedIn}
                  className={`
                    px-4 py-2 rounded-lg font-medium transition-all cursor-pointer
                    ${hasCheckedIn
                      ? 'bg-green-500 hover:bg-green-500 text-white'
                      : canCheckIn
                        ? 'bg-blue-500 hover:bg-blue-600 text-white'
                        : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                    }
                  `}
                >
                  {checkingIn ? (
                    '打卡中...'
                  ) : hasCheckedIn ? (
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />
                      已打卡
                    </span>
                  ) : canCheckIn ? (
                    '立即打卡'
                  ) : (
                    '完成10分钟学习即可打卡'
                  )}
                </Button>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>今日已学习 {todayMinutes} 分钟</p>
            </TooltipContent>
          </Tooltip>
        </div>
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* 左侧统计卡片 */}
        <div className="lg:col-span-1 space-y-5">
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
        {/* 左侧：打卡 + 学习记录 */}
        <div className="flex flex-col gap-4">
          <CheckInCard />
          <LearningRecordCard />
        </div>
        {/* 右侧：最近学习 */}
        <RecentLearningCard />
      </div>
    </div>
  )
}

export default HomePage
