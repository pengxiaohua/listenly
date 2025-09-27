'use client'

import { useState, useEffect } from 'react'
import StudyHeatmap from "./StudyHeatmap"
import { formatTimeAgo } from '@/lib/timeUtils'
import { } from 'lucide-react'

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
  }
}

interface RecentLearningItem {
  type: 'word' | 'sentence'
  category: string
  categoryName: string
  lastAttempt: string
  totalCount: number
  correctCount: number
}

const HomePage = () => {
  const [stats, setStats] = useState<UserStats | null>(null)
  const [recentLearning, setRecentLearning] = useState<RecentLearningItem[]>([])
  const [loading, setLoading] = useState(true)

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

  return (
    <div>
      <div className="flex">
        <div className="flex-1 h-[258px] flex flex-col gap-4 mr-4">
          <div className="p-4 bg-white rounded-lg border h-[50%] relative">
            <h3 className="text-lg font-semibold">生词本</h3>
            <div className="flex justify-between">
              <div>
                单词 <span className="text-blue-500"> {loading ? '...' : stats?.vocabulary.wordCount || 0} </span>个
              </div>
              <div>
                句子 <span className="text-blue-500"> {loading ? '...' : stats?.vocabulary.sentenceCount || 0} </span>个
              </div>
            </div>
            <div className="text-sm text-blue-500 cursor-pointer absolute right-4 bottom-4">查看详情</div>
          </div>
          <div className="p-4 bg-white rounded-lg border  h-[50%] relative">
            <h3 className="text-lg font-semibold">错词本</h3>
            <div className="flex justify-between">
              <div>
                单词 <span className="text-blue-500"> {loading ? '...' : stats?.wrongWords.wordCount || 0} </span>个
              </div>
              <div>
                句子 <span className="text-blue-500"> {loading ? '...' : stats?.wrongWords.sentenceCount || 0} </span>个
              </div>
            </div>
            <div className="text-sm text-blue-500 cursor-pointer absolute right-4 bottom-4">查看详情</div>
          </div>
        </div>
        <StudyHeatmap />
      </div>
      <div className="flex w-full gap-4">
        <div className="flex-1 p-4 bg-white rounded-lg border h-[50%] mt-4">
          <h3 className="text-lg font-semibold">学习记录</h3>
          <div className="flex justify-between">
            <div>
              单词拼写 <span className="text-blue-500"> {loading ? '...' : stats?.learning.wordSpellingCount || 0} </span>个
            </div>
            <div>
              句子听写 <span className="text-blue-500"> {loading ? '...' : stats?.learning.sentenceDictationCount || 0} </span>个
            </div>
          </div>
        </div>
        <div className="w-[634px] p-4 bg-white rounded-lg border h-[50%] mt-4">
          <h3 className="text-lg font-semibold mb-4">最近学习</h3>
          <div className="space-y-3">
            {loading ? (
              <div className="text-gray-500">加载中...</div>
            ) : recentLearning.length > 0 ? (
              recentLearning.map((item, index) => (
                <div key={`${item.type}-${item.category}-${index}`} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 cursor-pointer transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-1 text-xs rounded font-medium ${
                        item.type === 'word'
                          ? 'bg-blue-100 text-blue-600'
                          : 'bg-green-100 text-green-600'
                      }`}>
                        {item.type === 'word' ? '单词' : '句子'}
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        {item.categoryName}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>{formatTimeAgo(new Date(item.lastAttempt))}</span>
                      <span>·</span>
                      <span>已学 {item.totalCount} 个</span>
                      <span>·</span>
                      <span className={`${item.correctCount / item.totalCount >= 0.8 ? 'text-green-600' : 'text-orange-600'}`}>
                        正确率 {Math.round((item.correctCount / item.totalCount) * 100)}%
                      </span>
                    </div>
                  </div>
                  <div className="text-gray-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-gray-500 text-sm">暂无学习记录</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default HomePage
