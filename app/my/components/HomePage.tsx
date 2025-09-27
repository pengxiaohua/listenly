'use client'

import { useState, useEffect } from 'react'
import StudyHeatmap from "./StudyHeatmap"
import { } from 'lucide-react'

interface VocabularyStats {
  vocabulary: {
    wordCount: number
    sentenceCount: number
  }
  wrongWords: {
    wordCount: number
    sentenceCount: number
  }
}

const HomePage = () => {
  const [stats, setStats] = useState<VocabularyStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/user/vocabulary-stats')
        if (response.ok) {
          const data = await response.json()
          setStats(data.data)
        }
      } catch (error) {
        console.error('获取统计信息失败:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  return (
    <div>
      <div className="flex">
        <div className="flex-1 h-[258px] flex flex-col gap-4 mr-4">
          <div className="p-4 bg-white rounded-lg border h-[50%] relative">
            <h3 className="text-lg font-semibold">生词本</h3>
            <div className="flex justify-between">
              <div>
                单词{loading ? '...' : stats?.vocabulary.wordCount || 0}个
              </div>
              <div>
                句子{loading ? '...' : stats?.vocabulary.sentenceCount || 0}个
              </div>
            </div>
            <div className="text-sm text-blue-500 cursor-pointer absolute right-4 bottom-4">查看详情</div>
          </div>
          <div className="p-4 bg-white rounded-lg border  h-[50%] relative">
            <h3 className="text-lg font-semibold">错词本</h3>
            <div className="flex justify-between">
              <div>
                单词{loading ? '...' : stats?.wrongWords.wordCount || 0}个
              </div>
              <div>
                句子{loading ? '...' : stats?.wrongWords.sentenceCount || 0}个
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
              单词拼写xx个
            </div>
            <div>
              句子听写xx个
            </div>
          </div>
        </div>
        <div className="w-[634px] p-4 bg-white rounded-lg border h-[50%] mt-4">
          <h3 className="text-lg font-semibold">最近学习</h3>
          <div className="flex justify-between">
            <div>
              单词xx个
            </div>
            <div>
              句子xx个
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default HomePage
