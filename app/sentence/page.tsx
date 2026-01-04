'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, Volume2, BookA, Expand, Shrink } from 'lucide-react'

import AuthGuard from '@/components/auth/AuthGuard'
import { Progress } from '@/components/ui/progress'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import ExitPracticeDialog from '@/components/common/ExitPracticeDialog'
import SentenceSetSelector from './components/SentenceSetSelector'
import GroupList from './components/GroupList'
import SentenceTyping, { SentenceTypingRef } from './components/SentenceTyping'

export default function SentencePage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [corpora, setCorpora] = useState<{ id: number, slug: string, name: string, description?: string, ossDir: string }[]>([])
  const [corpusId, setCorpusId] = useState<number | null>(null)
  const [corpusSlug, setCorpusSlug] = useState<string>('')
  const [corpusOssDir, setCorpusOssDir] = useState<string>('')
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null)
  const [progress, setProgress] = useState<{ total: number, completed: number } | null>(null)
  const [groupProgress, setGroupProgress] = useState<{ done: number; total: number } | null>(null)
  const [showExitDialog, setShowExitDialog] = useState(false)
  const [showFullScreen, setShowFullScreen] = useState(false)
  const sentenceTypingRef = useRef<SentenceTypingRef | null>(null)
  const [controlsReady, setControlsReady] = useState(false)
  const [controlState, setControlState] = useState({
    isPlaying: false,
    playbackSpeed: 1,
    showTranslation: false,
    translating: false,
    isAddingToVocabulary: false,
    checkingVocabulary: false,
    isInVocabulary: false,
  })

  // 处理控制状态变化（替代定时轮询，只在状态真正变化时更新）
  const handleControlStateChange = useCallback((state: {
    isPlaying: boolean
    playbackSpeed: number
    showTranslation: boolean
    translating: boolean
    isAddingToVocabulary: boolean
    checkingVocabulary: boolean
    isInVocabulary: boolean
  }) => {
    setControlState(state)
  }, [])

  // 获取语料库列表
  useEffect(() => {
    fetch('/api/sentence/corpus')
      .then(res => res.json())
      .then(data => {
        setCorpora(data)
      })
  }, [])

  // 从URL参数初始化语料库(优先使用 slug)
  useEffect(() => {
    const slugParam = searchParams.get('set') || searchParams.get('sentenceSet') || searchParams.get('slug');
    const idParam = searchParams.get('id');
    if (corpora.length === 0) return;

    if (slugParam) {
      const found = corpora.find(c => c.slug === slugParam);
      if (found) {
        setCorpusId(found.id);
        setCorpusSlug(found.slug);
        setCorpusOssDir(found.ossDir);
      }
      return;
    }

    if (idParam) {
      const idNum = parseInt(idParam);
      const found = corpora.find(c => c.id === idNum);
      if (found) {
        setCorpusId(idNum);
        setCorpusSlug(found.slug);
        setCorpusOssDir(found.ossDir);
      }
    }
  }, [searchParams, corpora]);

  // 从URL参数初始化分组
  useEffect(() => {
    const groupOrderParam = searchParams.get('group')
    if (!groupOrderParam || !corpusSlug) {
      setSelectedGroupId(null)
      return
    }

    // 加载分组列表并匹配 order
    fetch(`/api/sentence/group?sentenceSet=${encodeURIComponent(corpusSlug)}`)
      .then(res => res.json())
      .then(res => {
        const groups = Array.isArray(res.data) ? res.data : []
        const orderNum = parseInt(groupOrderParam)
        const match = groups.find((g: { id: number; order: number }) => g.order === orderNum)
        if (match) {
          setSelectedGroupId(match.id)
          setGroupProgress({ done: match.done, total: match.total })
        } else {
          // 可能是虚拟分组，使用负数ID
          setSelectedGroupId(-orderNum)
          // 虚拟分组的进度需要从其他地方获取或设为默认值
          setGroupProgress({ done: 0, total: 20 })
        }
      })
      .catch(err => {
        console.error('加载分组失败:', err)
        setSelectedGroupId(null)
      })
  }, [corpusSlug, searchParams])

  // 获取进度（支持分组）
  const fetchProgress = useCallback(async () => {
    if (!corpusSlug) return
    try {
      if (selectedGroupId) {
        const res = await fetch(`/api/sentence/group?sentenceSet=${encodeURIComponent(corpusSlug)}`)
        const data = await res.json()
        const groups: Array<{ id: number; order: number; total: number; done: number }> = data?.data || []
        const match = groups.find((g) => g.id === selectedGroupId)
        if (match) {
          setGroupProgress({ done: match.done, total: match.total })
        }
      } else {
        const res = await fetch(`/api/sentence/stats?sentenceSet=${encodeURIComponent(corpusSlug)}`)
        const data = await res.json()
        setProgress(data)
      }
    } catch (error) {
      console.error('获取进度失败:', error)
    }
  }, [corpusSlug, selectedGroupId]);

  // 处理句子集选择
  const handleSelectSet = (slug: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('set', slug)
    router.push(`/sentence?${params.toString()}`)
  }

  // 处理分组选择
  const handleSelectGroup = (slug: string, groupOrder: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('set', slug)
    params.set('group', String(groupOrder))
    router.push(`/sentence?${params.toString()}`)
  }

  // 返回语料库选择
  const handleBackToCorpusList = () => {
    setCorpusId(null)
    setCorpusSlug('')
    setCorpusOssDir('')
    setSelectedGroupId(null)
    setProgress(null)
    setGroupProgress(null)

    // 清除URL参数
    router.push('/sentence')
  }

  // 处理返回按钮点击
  const handleBack = () => {
    setShowExitDialog(true)
  }

  // 返回当前课程详情
  const handleBackToCourseDetail = () => {
    setShowExitDialog(false)
    router.push(`/sentence?set=${corpusSlug}`)
  }

  // 处理返回课程列表
  const handleBackToCourseList = () => {
    setShowExitDialog(false)
    handleBackToCorpusList()
  }

  // 处理继续学习
  const handleContinueLearning = () => {
    setShowExitDialog(false)
  }

  // 判断当前应该显示哪个视图
  const groupParam = searchParams.get('group')
  const showTyping = corpusId && selectedGroupId && groupParam
  const showGroupList = corpusSlug && !groupParam
  const showSetSelector = !corpusId

  // 处理全屏切换
  const handleFullScreen = async () => {
    try {
      if (!document.fullscreenElement) {
        // 进入全屏
        await document.documentElement.requestFullscreen()

        // document.body.classList.add('word-fullscreen')
      } else {
        // 退出全屏
        await document.exitFullscreen()

        // document.body.classList.remove('word-fullscreen')
      }
    } catch (error) {
      console.error('全屏操作失败:', error)
    }
  }

  // 监听浏览器全屏状态变化
  useEffect(() => {
    const handleFullscreenChange = () => {
      setShowFullScreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    // 初始化状态
    setShowFullScreen(!!document.fullscreenElement)

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [])

  return (
    <AuthGuard>
      {/* 退出练习挽留弹窗 */}
      <ExitPracticeDialog
        open={showExitDialog}
        onOpenChange={setShowExitDialog}
        onBackToCourseList={handleBackToCourseList}
        onBackToCourseDetail={handleBackToCourseDetail}
        onContinue={handleContinueLearning}
        showBackToCourseDetail={!!corpusSlug}
      />

      {/* 进度条区域 */}
      {corpusId && selectedGroupId && (
        <div className="container mx-auto mt-6 relative">
          <Progress
            value={selectedGroupId && groupProgress
              ? (groupProgress.done / (groupProgress.total || 1)) * 100
              : (progress!.completed / (progress!.total || 1)) * 100}
            className="w-full h-3"
          />
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600">进度</span>
            <span className="text-sm text-gray-600">
              {selectedGroupId && groupProgress
                ? `${groupProgress.done} / ${groupProgress.total}`
                : `${progress!.completed} / ${progress!.total}`}
            </span>
          </div>

          <div className="flex items-center gap-4 absolute top-[50px] left-0 z-10 w-full justify-between">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleBack}
                  className="px-2 py-2 bg-gray-200 rounded-full cursor-pointer hover:bg-gray-300 flex items-center justify-center"
                >
                  <ChevronLeft className='w-6 h-6' />
                  {/* 返回 */}
                </button>
              </TooltipTrigger>
              <TooltipContent>
                返回
              </TooltipContent>
            </Tooltip>

            {/* 音频控制按钮组 */}
            {controlsReady && sentenceTypingRef.current && (
              <div className="flex items-center gap-4">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={sentenceTypingRef.current.handlePlayAudio}
                      className="px-2 py-2 bg-gray-200 hover:bg-gray-300 rounded-full"
                    >
                      <Volume2 className={`w-6 h-6 cursor-pointer ${controlState.isPlaying ? 'text-blue-500' : ''}`} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    播放音频
                  </TooltipContent>
                </Tooltip>
                {/* <Tooltip>
                  <TooltipTrigger asChild>
                    <select
                      value={sentenceTypingRef.current.playbackSpeed}
                      onChange={(e) => sentenceTypingRef.current?.setPlaybackSpeed(Number(e.target.value))}
                      className="px-2 py-1 border rounded text-sm"
                    >
                      <option value="0.75">0.75x</option>
                      <option value="1">1.0x</option>
                      <option value="1.25">1.25x</option>
                      <option value="1.5">1.5x</option>
                    </select>
                  </TooltipTrigger>
                  <TooltipContent>
                    调节语速
                  </TooltipContent>
                </Tooltip> */}
                {/* <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={sentenceTypingRef.current.handleTranslate}
                      disabled={sentenceTypingRef.current.translating}
                      className="p-2 hover:bg-gray-100 rounded-full"
                    >
                      <Languages className={`w-6 h-6 cursor-pointer ${sentenceTypingRef.current.translating ? 'opacity-50' : ''} ${sentenceTypingRef.current.showTranslation ? 'text-blue-500' : ''}`} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    查看翻译
                  </TooltipContent>
                </Tooltip> */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={sentenceTypingRef.current.handleAddToVocabulary}
                      disabled={controlState.isAddingToVocabulary || controlState.checkingVocabulary || controlState.isInVocabulary}
                      className={`p-2 rounded-full transition-colors ${controlState.isInVocabulary
                        ? 'bg-green-100 cursor-default'
                        : 'px-2 py-2 bg-gray-200 hover:bg-gray-300'
                        }`}
                    >
                      <BookA className={`w-6 h-6 ${controlState.checkingVocabulary || controlState.isAddingToVocabulary ? 'opacity-50' : ''
                        } ${controlState.isInVocabulary ? 'text-green-600' : 'cursor-pointer text-gray-600'
                        }`} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {controlState.checkingVocabulary
                      ? '检查中...'
                      : controlState.isAddingToVocabulary
                        ? '添加中...'
                        : controlState.isInVocabulary
                          ? '已在生词本'
                          : '加入生词本'
                    }
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      className="px-2 py-2 bg-gray-200 hover:bg-gray-300 rounded-full"
                      onClick={handleFullScreen}
                    >
                      {showFullScreen ? (
                        <Shrink className="w-6 h-6 cursor-pointer" />
                      ) : (
                        <Expand className="w-6 h-6 cursor-pointer" />
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {showFullScreen ? '退出全屏' : '全屏'}
                  </TooltipContent>
                </Tooltip>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="container mx-auto py-4 pt-0 relative">
        {/* 返回按钮 */}
        {corpusId && !selectedGroupId && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button onClick={handleBackToCorpusList} className="px-2 py-2 my-4 bg-gray-200 dark:bg-gray-800 rounded-full cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors flex items-center justify-center">
                <ChevronLeft className='w-6 h-6' />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              返回
            </TooltipContent>
          </Tooltip>
        )}
        {/* 句子内容集选择 */}
        {showSetSelector && (
          <SentenceSetSelector onSelectSet={handleSelectSet} />
        )}

        {/* 分组列表 */}
        {showGroupList && (
          <GroupList
            corpusSlug={corpusSlug}
            onSelectGroup={handleSelectGroup}
          />
        )}

        {/* 拼写练习 */}
        {showTyping && (
          <SentenceTyping
            ref={(ref) => {
              sentenceTypingRef.current = ref
              setControlsReady(!!ref)
            }}
            corpusSlug={corpusSlug}
            corpusOssDir={corpusOssDir}
            groupId={selectedGroupId}
            onProgressUpdate={fetchProgress}
            onBack={handleBack}
            onControlStateChange={handleControlStateChange}
          />
        )}
      </div>
    </AuthGuard>
  )
}
