'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { Users, CirclePlay, Mic, Square, Volume2, SkipForward, ChevronLeft, Hourglass, Clock } from 'lucide-react'
import * as AlertDialog from '@radix-ui/react-alert-dialog'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'

import AuthGuard from '@/components/auth/AuthGuard'
import Empty from '@/components/common/Empty'
import ExitPracticeDialog from '@/components/common/ExitPracticeDialog'
import SortFilter, { type SortType } from '@/components/common/SortFilter'
import { useGlobalLoadingStore } from '@/store'
import { getBeijingDateString, formatLastStudiedTime } from '@/lib/timeUtils'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { LiquidTabs } from '@/components/ui/liquid-tabs'

interface CatalogFirst { id: number; name: string; slug: string; seconds: CatalogSecond[] }
interface CatalogSecond { id: number; name: string; slug: string; thirds: CatalogThird[] }
interface CatalogThird { id: number; name: string; slug: string }

interface ShadowingSetItem {
  id: number
  name: string
  slug: string
  description?: string
  isPro: boolean
  coverImage?: string
  ossDir: string
  _count: { shadowings: number, done: number }
  learnersCount?: number
  createdTime?: string
}

export default function ShadowingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [catalogs, setCatalogs] = useState<CatalogFirst[]>([])
  const [selectedFirstId, setSelectedFirstId] = useState<string>('ALL')
  const [selectedSecondId, setSelectedSecondId] = useState<string>('')
  const [selectedThirdId, setSelectedThirdId] = useState<string>('')
  const [shadowingSets, setShadowingSets] = useState<ShadowingSetItem[]>([])
  const [isShadowingSetsLoading, setIsShadowingSetsLoading] = useState(false)
  const [sortBy, setSortBy] = useState<SortType>('popular')
  const [selectedSetId, setSelectedSetId] = useState<string>('')
  const [selectedSet, setSelectedSet] = useState<ShadowingSetItem | null>(null)
  const [shadowingGroups, setShadowingGroups] = useState<Array<{ id: number; name: string; kind: string; order: number; total: number; done: number; lastStudiedAt: string | null }>>([])
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null)
  const [current, setCurrent] = useState<{ id: number; text: string; translation?: string } | null>(null)
  const [setMeta, setSetMeta] = useState<{ name: string; ossDir: string } | null>(null)
  const [audioUrl, setAudioUrl] = useState('')
  const [recordedUrl, setRecordedUrl] = useState('')
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const recAudioRef = useRef<HTMLAudioElement | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const [recording, setRecording] = useState(false)
  const chunksRef = useRef<Blob[]>([])
  const [evaluating, setEvaluating] = useState(false)
  type EvalWord = { text?: string; score?: number; phonetic?: string; type?: number }
  type EvalLine = { words?: EvalWord[]; pronunciation?: number; fluency?: number; integrity?: number }
  type EvalResult = { score?: number; lines?: EvalLine[] }
  const [evalResult, setEvalResult] = useState<EvalResult | null>(null)
  const [micError, setMicError] = useState<string>('')
  const [progress, setProgress] = useState<{ total: number; completed: number } | null>(null)

  // 请求去重/缓存
  const mp3CacheRef = useRef<Record<number, string>>({})
  const translationCacheRef = useRef<Record<number, string>>({})
  const translatingRef = useRef<number | null>(null)

  // 本地限制与倒计时
  const [attemptsForCurrent, setAttemptsForCurrent] = useState<number>(0)
  const [countdown, setCountdown] = useState<number>(0)
  const countdownIntervalRef = useRef<number | null>(null)
  const autoStopTimeoutRef = useRef<number | null>(null)
  const [hasCreatedRecordForCurrent, setHasCreatedRecordForCurrent] = useState<boolean>(false)
  const [dailyLimitDialogOpen, setDailyLimitDialogOpen] = useState<boolean>(false)
  const [showExitDialog, setShowExitDialog] = useState(false)

  const { open, close } = useGlobalLoadingStore.getState()

  // 获取进度
  const fetchProgress = useCallback(async () => {
    const slug = searchParams.get('set')
    if (!slug) return
    try {
      const groupOrder = searchParams.get('group')
      // 分组列表页不显示整体进度，直接跳过，避免不必要的 /stats 请求
      if (!groupOrder) return
      // 优先从已加载的分组中推导，避免再次请求
      const gidParam = searchParams.get('groupId')
      let match: { order: number; total: number; done: number } | undefined
      if (gidParam) {
        const gid = parseInt(gidParam)
        const fromState = shadowingGroups.find(g => g.id === gid)
        if (fromState) match = { order: fromState.order, total: fromState.total, done: fromState.done }
      } else {
        const fromState = shadowingGroups.find(g => String(g.order) === groupOrder)
        if (fromState) match = { order: fromState.order, total: fromState.total, done: fromState.done }
      }
      if (match) {
        setProgress({ total: match.total, completed: match.done })
        return
      }
      // 回退再查一次分组（仅当本地没有时）
      const res = await fetch(`/api/shadowing/group?shadowingSet=${encodeURIComponent(slug)}`)
      const data = await res.json()
      const groups = (data?.data || []) as Array<{ order: number; total: number; done: number }>
      const found = groups.find(g => String(g.order) === groupOrder)
      if (found) setProgress({ total: found.total, completed: found.done })
    } catch (e) {
      console.error('获取进度失败:', e)
    }
  }, [searchParams, shadowingGroups])

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

  // 排序跟读集列表
  const sortShadowingSets = useCallback((sets: ShadowingSetItem[], sortType: SortType) => {
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

  // 根据目录筛选加载跟读集
  useEffect(() => {
    const params = new URLSearchParams()
    if (selectedFirstId && selectedFirstId !== 'ALL') params.set('catalogFirstId', selectedFirstId)
    if (selectedSecondId) params.set('catalogSecondId', selectedSecondId)
    if (selectedThirdId) params.set('catalogThirdId', selectedThirdId)

    setIsShadowingSetsLoading(true)
    fetch(`/api/shadowing/shadowing-set?${params.toString()}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          const sorted = sortShadowingSets(data.data, sortBy)
          setShadowingSets(sorted)
        }
      })
      .catch(err => console.error('加载跟读集失败:', err))
      .finally(() => setIsShadowingSetsLoading(false))
  }, [selectedFirstId, selectedSecondId, selectedThirdId, sortBy, sortShadowingSets])

  // 当排序方式改变时，重新排序已加载的跟读集
  useEffect(() => {
    if (shadowingSets.length > 0) {
      const sorted = sortShadowingSets(shadowingSets, sortBy)
      setShadowingSets(sorted)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy, sortShadowingSets])

  // 当选择跟读集时，跳转到分组列表页
  useEffect(() => {
    if (!selectedSetId) return
    const selected = shadowingSets.find(s => s.id === parseInt(selectedSetId))
    if (!selected) return
    // 直接跳转，分组列表由 URL 初始化逻辑加载
    const params = new URLSearchParams(searchParams.toString())
    params.set('set', selected.slug)
    router.push(`/shadowing?${params.toString()}`)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSetId])

  // 当从 URL 初始化且有 set 参数但无 group 时，加载分组列表
  useEffect(() => {
    const slug = searchParams.get('set')
    const hasGroup = !!searchParams.get('group')
    if (!slug || hasGroup) {
      setSelectedSet(null)
      return
    }

    // 从 shadowingSets 中找到对应的课程
    const found = shadowingSets.find(s => s.slug === slug)
    if (found) {
      setSelectedSet(found)
    } else {
      // 如果本地没有，尝试从 API 获取
      fetch(`/api/shadowing/shadowing-set?slug=${encodeURIComponent(slug)}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.data && data.data.length > 0) {
            setSelectedSet(data.data[0])
          }
        })
        .catch(() => {})
    }

    // 切换到新的 set 时先清空旧分组，避免短暂显示为空
    setShadowingGroups([])

    fetch(`/api/shadowing/group?shadowingSet=${encodeURIComponent(slug)}`)
      .then(res => res.json())
      .then(res => {
        const groups = Array.isArray(res.data) ? res.data : []
        setShadowingGroups(groups)
      })
      .catch(err => console.error('加载分组失败:', err))
  }, [searchParams, shadowingSets])

  // 从URL参数初始化分组
  useEffect(() => {
    const groupOrderParam = searchParams.get('group')
    const slug = searchParams.get('set')
    if (!slug) {
      setSelectedGroupId(null)
      return
    }

    const gidParam = searchParams.get('groupId')
    if (gidParam) {
      setSelectedGroupId(parseInt(gidParam))
      return
    }

    if (!groupOrderParam) {
      setSelectedGroupId(null)
      return
    }

    // 加载分组列表并匹配 order（仅当没有 groupId 时）
    fetch(`/api/shadowing/group?shadowingSet=${encodeURIComponent(slug)}`)
      .then(res => res.json())
      .then(res => {
        const groups = Array.isArray(res.data) ? res.data : []
        setShadowingGroups(groups)
        const orderNum = parseInt(groupOrderParam)
        const match = groups.find((g: { id: number; order: number }) => g.order === orderNum)
        if (match) {
          setSelectedGroupId(match.id)
        } else {
          setSelectedGroupId(null)
        }
      })
      .catch(err => {
        console.error('加载分组失败:', err)
        setSelectedGroupId(null)
      })
  }, [searchParams])

  // 加载当前句子（进入练习）
  useEffect(() => {
    const slug = searchParams.get('set')
    if (!slug) return
    const groupParam = searchParams.get('group')
    // 如果有 group 参数，说明已选择分组，需要获取句子
    // 如果没有 group 参数，说明在分组列表页，不需要获取句子
    if (!groupParam) return

    const gid = searchParams.get('groupId') || (selectedGroupId ? String(selectedGroupId) : null)
    const params = new URLSearchParams({ shadowingSet: slug })
    if (gid) params.set('groupId', gid)
    fetch(`/api/shadowing/get?${params.toString()}`)
      .then(res => res.json())
      .then(async data => {
        if (data?.completed) {
          setCurrent(null)
          return
        }
        setCurrent({ id: data.id, text: data.text, translation: data.translation })
        setSetMeta({ name: data.shadowingSet.name, ossDir: data.shadowingSet.ossDir })

        // 若无翻译，调用句子翻译接口并写回 Shadowing（服务端目前写回 Sentence；此处仅获取翻译展示）
        if (!data.translation && data.text && data.id) {
          // 先查缓存，避免重复请求
          const cached = translationCacheRef.current[data.id]
          if (cached) {
            setCurrent(prev => prev ? { ...prev, translation: cached } : prev)
          } else if (translatingRef.current !== data.id) {
            try {
              translatingRef.current = data.id
              const resp = await fetch('/api/shadowing/translate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: data.text, sentenceId: data.id })
              })
              const tr = await resp.json()
              if (tr.success && tr.translation) {
                translationCacheRef.current[data.id] = tr.translation
                setCurrent(prev => prev ? { ...prev, translation: tr.translation } : prev)
              }
            } catch {
            } finally {
              translatingRef.current = null
            }
          }
        }
      })
      .catch(err => console.error('加载跟读内容失败:', err))
  }, [searchParams, selectedGroupId])

  // 监听参数变化，单独拉取进度
  useEffect(() => {
    fetchProgress()
  }, [fetchProgress])

  // 切换句子时，重置倒计时并读取当日本地统计
  useEffect(() => {
    const clearTimers = () => {
      if (countdownIntervalRef.current) { window.clearInterval(countdownIntervalRef.current); countdownIntervalRef.current = null }
      if (autoStopTimeoutRef.current) { window.clearTimeout(autoStopTimeoutRef.current); autoStopTimeoutRef.current = null }
      setCountdown(0)
    }
    clearTimers()
    setHasCreatedRecordForCurrent(false)
    try {
      const todayKey = getBeijingDateString()
      const attemptsRaw = localStorage.getItem(`shadow_attempts_${todayKey}`) || '{}'
      const attemptsMap = JSON.parse(attemptsRaw) as Record<string, number>
      const curId = current?.id ? String(current.id) : ''
      setAttemptsForCurrent(curId ? (attemptsMap[curId] || 0) : 0)
    } catch {
      setAttemptsForCurrent(0)
    }
    return () => {
      if (countdownIntervalRef.current) { window.clearInterval(countdownIntervalRef.current); countdownIntervalRef.current = null }
      if (autoStopTimeoutRef.current) { window.clearTimeout(autoStopTimeoutRef.current); autoStopTimeoutRef.current = null }
    }
  }, [current?.id])

  // 获取音频并自动播放（按句子ID与集合目录去重）
  useEffect(() => {
    const slug = searchParams.get('set')
    if (!current?.id || !current?.text || !setMeta?.ossDir || !slug) return
    const cached = mp3CacheRef.current[current.id]
    if (cached) {
      setAudioUrl(cached)
      return
    }
    fetch(`/api/sentence/mp3-url?sentence=${encodeURIComponent(current.text)}&dir=${setMeta.ossDir}`)
      .then(res => res.json())
      .then(mp3 => {
        if (mp3?.url) {
          mp3CacheRef.current[current.id] = mp3.url
          setAudioUrl(mp3.url)
        }
      })
      .catch(err => console.error('获取MP3失败:', err))
  }, [current?.id, current?.text, setMeta?.ossDir, searchParams])

  // 当音频地址更新时，尝试自动播放，并在 canplay/canplaythrough 触发时再次尝试
  useEffect(() => {
    if (!audioUrl || !audioRef.current) return
    const audio = audioRef.current
    try { audio.pause() } catch { }
    audio.src = audioUrl
    audio.currentTime = 0
    audio.load()

    const tryPlay = () => {
      audio.play().catch(() => { /* autoplay 可能被拦截，留给按钮触发 */ })
    }
    const onCanPlay = () => tryPlay()
    const onCanPlayThrough = () => tryPlay()

    audio.addEventListener('canplay', onCanPlay)
    audio.addEventListener('canplaythrough', onCanPlayThrough)

    // 先尝试一次，部分浏览器立即可播
    tryPlay()

    return () => {
      audio.removeEventListener('canplay', onCanPlay)
      audio.removeEventListener('canplaythrough', onCanPlayThrough)
    }
  }, [audioUrl])

  // 切换到下一句：创建一条完成记录以跳过当前句子，然后重新拉取下一条
  const goNext = async () => {
    if (!current) return
    try {
      // 若本句尚未通过录音创建记录，则以跳过方式创建
      if (!hasCreatedRecordForCurrent) {
        const recordResp = await fetch('/api/shadowing/create-record', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ shadowingId: current.id })
        })
        const recordData = await recordResp.json()

        // 如果有错误提示，则弹窗
        if (recordData.error) {
          setDailyLimitDialogOpen(true)
          return
        }
        // 乐观更新：本地进度 +1（仅在分组模式下）
        const gidParam = searchParams.get('groupId')
        const gid = gidParam ? parseInt(gidParam) : (selectedGroupId || null)
        if (gid) {
          setShadowingGroups(prev => prev.map(g => g.id === gid ? { ...g, done: Math.min(g.done + 1, g.total) } : g))
          setProgress(prev => prev ? { total: prev.total, completed: Math.min(prev.completed + 1, prev.total) } : prev)
        }
      }
      await fetchProgress()
    } catch { }

    // 重置本地评测/音频状态
    setEvaluating(false)
    setEvalResult(null)
    setAudioUrl('')
    setRecordedUrl('')

    const slug = searchParams.get('set')
    if (!slug) return
    try {
      const gid = searchParams.get('groupId') || (selectedGroupId ? String(selectedGroupId) : null)
      const params = new URLSearchParams({ shadowingSet: slug })
      if (gid) params.set('groupId', gid)
      const res = await fetch(`/api/shadowing/get?${params.toString()}`)
      const data = await res.json()
      if (data?.completed) {
        setCurrent(null)
        return
      }
      setCurrent({ id: data.id, text: data.text, translation: data.translation })
      setSetMeta({ name: data.shadowingSet.name, ossDir: data.shadowingSet.ossDir })

      // 若无翻译，和初次加载时保持一致逻辑，补充翻译
      if (!data.translation && data.text && data.id) {
        try {
          const resp = await fetch('/api/shadowing/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: data.text, sentenceId: data.id })
          })
          const tr = await resp.json()
          if (tr.success && tr.translation) {
            setCurrent(prev => prev ? { ...prev, translation: tr.translation } : prev)
          }
        } catch { }
      }
    } catch (err) {
      console.error('切换下一句失败:', err)
    }
  }

  // 手动停止录音（或供自动超时调用）
  const stopRecording = () => {
    if (countdownIntervalRef.current) { window.clearInterval(countdownIntervalRef.current); countdownIntervalRef.current = null }
    if (autoStopTimeoutRef.current) { window.clearTimeout(autoStopTimeoutRef.current); autoStopTimeoutRef.current = null }
    setCountdown(0)
    try { mediaRecorderRef.current?.stop() } catch { }
    setRecording(false)
  }

  // 格式化数据，保留一位小数
  const formatScore = (score: number) => {
    // 如果不是Number类型，返回--
    if (typeof score !== 'number') return '--'
    // 如果是整数，直接返回
    if (Number.isInteger(score)) return score.toString()
    // 否则保留一位小数
    return score.toFixed(1)
  }

  // 停止按钮倒计时环参数（外圈在按钮外侧）
  const TOTAL_SECONDS = 10
  const BUTTON_SIZE = 56
  const STROKE_WIDTH = 4
  const RING_GAP = 4 // 按钮外侧与圆环之间的间隙
  const RING_SIZE = BUTTON_SIZE + RING_GAP * 2 + STROKE_WIDTH
  const R = (RING_SIZE - STROKE_WIDTH) / 2
  const C = 2 * Math.PI * R
  const remainingRatio = Math.max(0, Math.min(1, countdown / TOTAL_SECONDS))
  const arcLen = Math.max(C * remainingRatio, 2)

  // 处理返回按钮点击（显示弹窗）
  const handleBack = () => {
    setShowExitDialog(true)
  }

  // 返回当前课程详情（分组列表页）
  const handleBackToCourseDetail = () => {
    setShowExitDialog(false)
    const slug = searchParams.get('set')
    if (slug) {
      router.push(`/shadowing?set=${slug}`)
      setCurrent(null);
      setSetMeta(null);
      setAudioUrl('');
      setRecordedUrl('');
      setSelectedSetId('');
      setSelectedGroupId(null);
    }
  }

  // 处理返回课程列表
  const handleBackToCourseList = () => {
    setShowExitDialog(false)
    router.push('/shadowing')
    setCurrent(null);
    setSetMeta(null);
    setAudioUrl('');
    setRecordedUrl('');
    setSelectedSetId('');
    setSelectedGroupId(null);
  }

  // 处理继续学习
  const handleContinueLearning = () => {
    setShowExitDialog(false)
  }

  // 返回首页（直接返回，不显示弹窗）
  const handleBackToHome = () => {
    router.push('/shadowing')
    setCurrent(null)
    setSetMeta(null)
    setAudioUrl('')
    setRecordedUrl('')
    setSelectedSetId('')
    setSelectedGroupId(null)
    setSelectedSet(null)
  }

  const setSlug = searchParams.get('set') || ''

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
      <AuthGuard>
        {/* 退出练习挽留弹窗 */}
        <ExitPracticeDialog
          open={showExitDialog}
          onOpenChange={setShowExitDialog}
          onBackToCourseList={handleBackToCourseList}
          onBackToCourseDetail={setSlug ? handleBackToCourseDetail : undefined}
          onContinue={handleContinueLearning}
          showBackToCourseDetail={!!setSlug}
        />
        {/* 进度条区域 */}
        {searchParams.get('set') && searchParams.get('group') && progress && (
          <div className="container mx-auto mt-6">
            <Progress value={(progress.completed / progress.total) * 100} className="w-full h-2" />
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">进度</span>
              <span className="text-sm text-gray-600">{progress.completed} / {progress.total}</span>
            </div>
          </div>
        )}

        <div className="container mx-auto py-4 pt-0">
          <style jsx>{`
          .vu-bars {
            display: flex;
            align-items: center; /* 垂直居中 */
            gap: 4px;
            height: 24px;
          }
          .vu-bar {
            width: 3px;
            background: linear-gradient(180deg, #ffb97a 0%, #ff7a45 100%);
            border-radius: 2px;
            animation: vuPulse 900ms ease-in-out infinite;
            transform-origin: center; /* 从中心向上下伸缩 */
          }
          /* 右侧（从靠近按钮到远端再回到高点，共11条）：延迟先递增后递减，中心同步到按钮 */
          .vu-bars.right .vu-bar:nth-child(1) { animation-delay: 0ms; }
          .vu-bars.right .vu-bar:nth-child(2) { animation-delay: 30ms; }
          .vu-bars.right .vu-bar:nth-child(3) { animation-delay: 60ms; }
          .vu-bars.right .vu-bar:nth-child(4) { animation-delay: 120ms; }
          .vu-bars.right .vu-bar:nth-child(5) { animation-delay: 180ms; }
          .vu-bars.right .vu-bar:nth-child(6) { animation-delay: 240ms; }
          .vu-bars.right .vu-bar:nth-child(7) { animation-delay: 300ms; }
          .vu-bars.right .vu-bar:nth-child(8) { animation-delay: 240ms; }
          .vu-bars.right .vu-bar:nth-child(9) { animation-delay: 180ms; }
          .vu-bars.right .vu-bar:nth-child(10) { animation-delay: 120ms; }
          .vu-bars.right .vu-bar:nth-child(11){ animation-delay: 60ms; }
          .vu-bars.right .vu-bar:nth-child(12){ animation-delay: 30ms; }
          .vu-bars.right .vu-bar:nth-child(13){ animation-delay: 0ms; }
          /* 左侧镜像（从远端到靠近按钮再回远端，共11条） */
          .vu-bars.left .vu-bar:nth-child(1)  { animation-delay: 0ms; }
          .vu-bars.left .vu-bar:nth-child(2)  { animation-delay: 30ms; }
          .vu-bars.left .vu-bar:nth-child(2)  { animation-delay: 60ms; }
          .vu-bars.left .vu-bar:nth-child(3)  { animation-delay: 120ms; }
          .vu-bars.left .vu-bar:nth-child(4)  { animation-delay: 180ms; }
          .vu-bars.left .vu-bar:nth-child(5)  { animation-delay: 240ms; }
          .vu-bars.left .vu-bar:nth-child(6)  { animation-delay: 300ms; }
          .vu-bars.left .vu-bar:nth-child(7)  { animation-delay: 240ms; }
          .vu-bars.left .vu-bar:nth-child(8)  { animation-delay: 180ms; }
          .vu-bars.left .vu-bar:nth-child(9)  { animation-delay: 120ms; }
          .vu-bars.left .vu-bar:nth-child(10) { animation-delay: 60ms; }
          .vu-bars.left .vu-bar:nth-child(11) { animation-delay: 0ms; }
          .vu-bars.left .vu-bar:nth-child(12) { animation-delay: 30ms; }
          .vu-bars.left .vu-bar:nth-child(13) { animation-delay: 0ms; }
          @keyframes vuPulse {
            0%   { transform: scaleY(1);   opacity: 0.85; }
            40%  { transform: scaleY(1.9); opacity: 1; }
            80%  { transform: scaleY(0.7); opacity: 0.9; }
            100% { transform: scaleY(1);   opacity: 0.85; }
          }
        `}</style>
          {!searchParams.get('set') && (
            <div className="mb-4">
              {/* 顶部级联筛选导航，与句子页一致 */}
              <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
                <div className="container mx-auto py-3 relative">
                  {/* 筛选条件 */}
                  <div className="absolute top-3 right-0">
                    <SortFilter sortBy={sortBy} onSortChange={setSortBy} />
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
                      size="md"
                      align="left"
                      className="overflow-x-auto"
                      id="first"
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

              {/* 跟读课程包列表 */}
              {isShadowingSetsLoading ? (
                <div className="flex flex-wrap gap-4 md:gap-3 mt-4">
                  {Array.from({ length: 12 }).map((_, idx) => (
                    <div
                      key={`shadowing-set-skeleton-${idx}`}
                      className="w-full sm:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.6666rem)] xl:w-[calc(25%-0.8333rem)] 2xl:p-4 p-3 bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm border border-gray-200 dark:border-gray-700"
                    >
                      <div className="flex h-full">
                        <Skeleton className="w-[105px] h-[148px] rounded-lg mr-3 3xl:mr-4 flex-shrink-0" />
                        <div className="flex-1 flex flex-col justify-between">
                          <div>
                            <Skeleton className="h-5 w-4/5 mb-3" />
                            <div className="flex items-center gap-3">
                              <Skeleton className="h-4 w-14" />
                              <Skeleton className="h-4 w-16" />
                            </div>
                            <div className="mt-2">
                              <Skeleton className="h-6 w-14 rounded-full" />
                            </div>
                          </div>
                          <div>
                            <Skeleton className="h-4 w-28 mb-2" />
                            <Skeleton className="w-full h-2" />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : shadowingSets.length > 0 ? (
                <div className="flex flex-wrap gap-4 md:gap-3 mt-4">
                  {shadowingSets.map((s) => (
                    <div
                      key={s.id}
                      onClick={() => setSelectedSetId(String(s.id))}
                      className="w-full sm:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.6666rem)] xl:w-[calc(25%-0.8333rem)] 2xl:p-4 p-3 bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm hover:shadow-md hover:bg-gray-100 dark:hover:bg-gray-600 transition-shadow cursor-pointer border border-gray-200 dark:border-gray-700 group"
                    >
                      <div className="flex h-full">
                        {/* 课程封面 - 左侧 */}
                        <div className="relative w-[105px] h-[148px] rounded-lg mr-3 3xl:mr-4 flex-shrink-0 bg-gradient-to-br from-blue-400 to-purple-500">
                          {s.coverImage ? (
                            <Image
                              fill
                              src={(s.coverImage || '').trim()}
                              alt={s.name}
                              className="w-full h-full object-cover rounded-lg"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-white text-lg font-bold px-4">
                              {s.name}
                            </div>
                          )}
                        </div>
                        {/* 课程信息 - 右侧 */}
                        <div className="flex-1 flex flex-col justify-between">
                          <div>
                            <h3 className="font-bold text-base mb-2 line-clamp-2">{s.name}</h3>
                            <div className='flex items-center gap-4 text-sm text-gray-500'>
                              <p>{s._count.shadowings} 条</p>
                              <div className="flex items-center">
                                <Users className='w-4 h-4' />
                                <p className='ml-1'>{s.learnersCount ?? 0}人</p>
                              </div>
                            </div>
                            <div className='mt-2'>
                              {s.isPro ? (
                                <span className="text-xs bg-orange-600 text-white rounded-full px-3 py-1">
                                  会员
                                </span>
                              ) : (
                                <span className="text-xs bg-green-600 text-white rounded-full px-3 py-1">
                                  免费
                                </span>
                              )}
                            </div>
                          </div>
                          {/* 进度条 */}
                          <div>
                            <div className='text-sm text-gray-500 mb-1'>进度：{s._count.done > 0 ? `${s._count.done}/${s._count.shadowings}` : '未开始'}</div>
                            <Progress value={s._count.done / s._count.shadowings * 100} className="w-full h-2" />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 text-gray-400">
                  <Empty text="暂无课程包" />
                </div>
              )}
            </div>
          )}

          {/* 分组整页列表（当 URL 有 set 但无 group） */}
          {searchParams.get('set') && !searchParams.get('group') && (
            <>
              {/* 返回按钮和课程概述 */}
              {setSlug && (
                <>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button onClick={handleBackToHome} className="px-2 py-2 my-4 bg-gray-200 dark:bg-gray-800 rounded-full cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors flex items-center justify-center">
                        <ChevronLeft className='w-6 h-6' />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      返回
                    </TooltipContent>
                  </Tooltip>
                  <div className="mb-4 p-4 border rounded-lg bg-white dark:bg-gray-900 flex items-center gap-4">
                    <div className="w-22 h-30 rounded overflow-hidden flex-shrink-0 bg-gradient-to-br from-blue-400 to-purple-500">
                      {selectedSet?.coverImage ? (
                        <Image width={96} height={96} src={(selectedSet.coverImage || '').trim()} alt={selectedSet.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white text-sm font-bold px-2 text-center">
                          {selectedSet?.name || setSlug}
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="text-2xl font-semibold">{selectedSet?.name || setSlug}</div>
                      <div className="text-base text-gray-500 mt-1 flex gap-4 flex-wrap">
                        <span>共 {shadowingGroups.length} 组</span>
                        <span>句子数：{selectedSet?._count?.shadowings ?? shadowingGroups.reduce((s, g) => s + g.total, 0)}</span>
                        <span>总进度：{
                          (() => {
                            const done = shadowingGroups.reduce((s, g) => s + g.done, 0)
                            const total = shadowingGroups.reduce((s, g) => s + g.total, 0)
                            return `${done}/${total || 0}`
                          })()
                        }</span>
                      </div>
                      <div className="flex items-center gap-2 mt-4">
                        <div className="text-sm flex items-center text-gray-500">
                          <Users className='w-4 h-4' />
                          <span className='ml-1'>{selectedSet?.learnersCount ?? 0}人</span>
                        </div>
                        {
                          selectedSet?.isPro ?
                            <span className="text-xs border bg-orange-500 text-white rounded-full px-3 py-1 flex items-center justify-center">会员</span>
                            : <span className="text-xs border bg-green-500 text-white rounded-full px-3 py-1 flex items-center justify-center">免费</span>
                        }
                      </div>
                      {selectedSet?.description && (
                        <div className="text-sm text-gray-600 mt-1 line-clamp-2">{selectedSet.description}</div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {shadowingGroups.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  {shadowingGroups.map(g => (
                    <button key={g.id}
                      onClick={() => {
                        const slug = searchParams.get('set')!
                        const params = new URLSearchParams(searchParams.toString())
                        params.set('set', slug)
                        params.set('group', String(g.order))
                        params.set('groupId', String(g.id))
                        router.push(`/shadowing?${params.toString()}`)
                      }}
                      className="text-left p-4 border rounded hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                      <div className="text-2xl font-semibold">{g.name}</div>
                      <div className="text-base text-gray-500 mt-1">第{g.order}组</div>
                      <div className='flex items-center gap-4 mt-1'>
                        <div className="text-base text-gray-500 flex items-center">
                          <Hourglass className='w-4 h-4' />
                          <span className='ml-1'>{g.done}/{g.total}</span>
                        </div>
                        <div className="text-base text-gray-500 flex items-center">
                          <Clock className='w-4 h-4' />
                          <span className='ml-1'>{formatLastStudiedTime(g.lastStudiedAt)}</span>
                        </div>
                        {g.done >= g.total && (
                          <div className="text-xs border bg-green-500 text-white rounded-full px-3 py-1 flex items-center justify-center">
                            已完成
                          </div>
                        )}
                        {g.done > 0 && g.done < g.total && (
                          <Progress value={g.done / g.total * 100} className="flex-1 h-2" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 text-gray-400">
                  <Empty text="加载分组中..." />
                </div>
              )}
            </>
          )}

          {/* 练习区域：当 URL 携带 set 且已选择分组并加载当前句子时显示 */}
          {searchParams.get('set') && searchParams.get('group') && selectedGroupId && (
            <div>
              <div className="mb-4 flex justify-between items-center gap-4">
                {/* <span>当前跟读集：<b>{setMeta?.name || ''}</b></span> */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={handleBack}
                      className="px-2 py-2 bg-gray-200 rounded-full cursor-pointer hover:bg-gray-300 flex items-center justify-center"
                    >
                      <ChevronLeft className='w-6 h-6' />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    返回
                  </TooltipContent>
                </Tooltip>
                <div className='flex items-center gap-4'>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => {
                          if (!audioRef.current) return
                          try {
                            const a = audioRef.current
                            if (a.src !== audioUrl) {
                              a.src = audioUrl || ''
                              a.load()
                            }
                            a.currentTime = 0
                            a.play().catch(() => { })
                          } catch { }
                        }}
                        className="px-2 py-2 bg-gray-200 rounded-full cursor-pointer hover:bg-gray-300"
                      >
                        <Volume2 />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" sideOffset={6}>朗读句子</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        disabled={!current || recording || evaluating}
                        onClick={goNext}
                        className="px-2 py-2 bg-gray-200 rounded-full cursor-pointer hover:bg-gray-300 disabled:opacity-50 flex items-center justify-center gap-1"
                      >
                        <SkipForward />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" sideOffset={6}>下一句</TooltipContent>
                  </Tooltip>
                </div>

                <audio ref={audioRef} preload="auto" style={{ display: 'none' }} />
                <audio ref={recAudioRef} preload="auto" style={{ display: 'none' }} />
              </div>

              <div className="text-2xl md:text-4xl font-medium mb-2 text-center">
                {current?.text || '加载中...'}
              </div>
              <div className="text-xl text-gray-600 text-center">
                {current?.translation || '翻译加载中...'}
              </div>

              {/* 录音与评测 */}
              <div className="mt-6 flex flex-col items-center gap-3">
                {
                  (current && !recording) &&
                  <div className='flex flex-col justify-center items-center gap-1'>
                    <button
                      disabled={!current || recording || evaluating || attemptsForCurrent >= 3}
                      onClick={async () => {
                        setMicError('')
                        setRecordedUrl('')
                        setEvalResult(null)
                        if (!current) return
                        // 本地限制检查：每句最多3次；每天最多5个句子
                        try {
                          const todayKey = getBeijingDateString()
                          const attemptsMap = JSON.parse(localStorage.getItem(`shadow_attempts_${todayKey}`) || '{}') as Record<string, number>
                          const uniqueArr = JSON.parse(localStorage.getItem(`shadow_unique_${todayKey}`) || '[]') as string[]
                          const uniqueSet = new Set(uniqueArr)
                          const curId = String(current.id)
                          const curAttempts = attemptsMap[curId] || 0
                          if (curAttempts >= 3) {
                            setMicError('每个句子跟读次数最多 3 次')
                            return
                          }
                          const isNewSentenceToday = !uniqueSet.has(curId)
                          if (isNewSentenceToday && uniqueSet.size >= 5) {
                            setDailyLimitDialogOpen(true)
                            return
                          }
                        } catch { }
                        if (!navigator.mediaDevices?.getUserMedia) {
                          setMicError('当前浏览器不支持录音 API')
                          return
                        }
                        try {
                          // 预检测麦克风权限
                          const navPerm = (navigator as unknown as { permissions?: { query: (arg: { name: 'microphone' }) => Promise<{ state: PermissionState }> } }).permissions
                          const perm = navPerm ? await navPerm.query({ name: 'microphone' }) : null
                          if (perm && perm.state === 'denied') {
                            setMicError('浏览器已拦截麦克风。请点击地址栏相机/麦克风图标允许，或在系统设置中开启麦克风权限后重试。')
                            return
                          }
                        } catch { /* ignore */ }

                        let stream: MediaStream
                        try {
                          stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
                        } catch {
                          setMicError('未获得麦克风权限。请允许网站使用麦克风后重试。')
                          return
                        }
                        // 选择第三方支持的容器，优先 WAV，其次 OGG；若不支持则回退 WebM(稍后转 WAV)
                        const candidates = ['audio/wav', 'audio/ogg;codecs=opus', 'audio/ogg', 'audio/webm;codecs=opus', 'audio/webm']
                        let mimeType: string | undefined
                        if (typeof MediaRecorder !== 'undefined' && typeof MediaRecorder.isTypeSupported === 'function') {
                          mimeType = candidates.find(t => MediaRecorder.isTypeSupported(t))
                        }
                        // 如果 API 不支持能力判断或都不支持（连 webm 也不支持），直接提示
                        if (!mimeType) {
                          alert('当前浏览器不支持 WAV/OGG 录音，请更换现代浏览器（建议 Chrome 或 Safari 17+）。')
                          return
                        }
                        const mr = new MediaRecorder(stream, { mimeType })
                        chunksRef.current = []
                        mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
                        mr.onstop = async () => {
                          // 将录音统一转码为 16kHz 单声道 16bit PCM WAV，以满足第三方要求
                          const inputBlob = new Blob(chunksRef.current, { type: mimeType })
                          const arrayBuf = await inputBlob.arrayBuffer()
                          const AudioCtxCtor = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)
                          const audioCtx = new AudioCtxCtor()
                          const decoded = await audioCtx.decodeAudioData(arrayBuf)

                          // 合成为单声道
                          const length = decoded.length
                          const chs = decoded.numberOfChannels
                          const tmp = new Float32Array(length)
                          for (let i = 0; i < chs; i++) {
                            const data = decoded.getChannelData(i)
                            for (let j = 0; j < length; j++) tmp[j] += data[j] / chs
                          }
                          const monoBuffer = audioCtx.createBuffer(1, length, decoded.sampleRate)
                          monoBuffer.getChannelData(0).set(tmp)

                          // 使用 OfflineAudioContext 重采样到 16000 Hz
                          const targetRate = 16000
                          const offlineCtor = (window.OfflineAudioContext || (window as unknown as { webkitOfflineAudioContext: typeof OfflineAudioContext }).webkitOfflineAudioContext)
                          const offline = new offlineCtor(1, Math.ceil(monoBuffer.duration * targetRate), targetRate)
                          const src = offline.createBufferSource()
                          src.buffer = monoBuffer
                          src.connect(offline.destination)
                          src.start(0)
                          const rendered: AudioBuffer = await offline.startRendering()

                          // 写入 WAV（16-bit PCM, mono, 16kHz）
                          const numOfChan = 1
                          const outLength = rendered.length * numOfChan * 2 + 44
                          const buffer = new ArrayBuffer(outLength)
                          const view = new DataView(buffer)
                          const channel = rendered.getChannelData(0)
                          let offset = 0
                          const writeString = (str: string, pos: number) => { for (let i = 0; i < str.length; i++) view.setUint8(pos + i, str.charCodeAt(i)) }
                          writeString('RIFF', 0); view.setUint32(4, 36 + rendered.length * numOfChan * 2, true)
                          writeString('WAVE', 8); writeString('fmt ', 12); view.setUint32(16, 16, true); view.setUint16(20, 1, true)
                          view.setUint16(22, numOfChan, true); view.setUint32(24, targetRate, true)
                          view.setUint32(28, targetRate * numOfChan * 2, true); view.setUint16(32, numOfChan * 2, true)
                          view.setUint16(34, 16, true); writeString('data', 36); view.setUint32(40, rendered.length * numOfChan * 2, true)
                          offset = 44
                          for (let i = 0; i < rendered.length; i++) {
                            let sample = channel[i]
                            sample = Math.max(-1, Math.min(1, sample))
                            view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true)
                            offset += 2
                          }

                          const blob = new Blob([buffer], { type: 'audio/wav' })
                          const ext = 'wav'
                          const file = new File([blob], `record.${ext}`, { type: 'audio/wav' })
                          const form = new FormData()
                          form.append('audio', file)
                          const uploadResp = await fetch('/api/shadowing/upload-audio', { method: 'POST', body: form })
                          const upload = await uploadResp.json()
                          if (!upload?.success) return
                          setRecordedUrl(upload.url || '')

                          // 评测（直连代理：前端可视化所有入参/出参）
                          setEvaluating(true)
                          open('评测中...')
                          try {
                            const fd = new FormData()
                            fd.set('mode', 'E')
                            fd.set('text', current?.text || '')
                            // 直接使用已生成的 WAV 文件，避免从 OSS 下载导致的 CORS 问题
                            fd.set('voice', file)
                            // 走正式后端 evaluate，保持当前前端 FormData 方式
                            const evalResp = await fetch(`/api/shadowing/evaluate?format=wav`, { method: 'POST', body: fd })
                            const evalJson = await evalResp.json()
                            if (evalJson?.success && evalJson?.data) {
                              const engine = evalJson.data?.EngineResult || evalJson.data
                              setEvalResult(engine)
                              // 评测成功后创建记录，包含 score/ossUrl/sentence
                              try {
                                await fetch('/api/shadowing/create-record', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ shadowingId: current?.id, score: engine?.score, ossUrl: upload.url, sentence: current?.text })
                                })
                                setHasCreatedRecordForCurrent(true)
                              } catch { }
                            }
                          } finally {
                            setEvaluating(false)
                            close()
                          }
                        }
                        // 录音完成后更新本地统计（尝试次数与当日唯一句子数）
                        try {
                          const todayKey = getBeijingDateString()
                          const curId = current?.id ? String(current.id) : ''
                          if (curId) {
                            const attemptsMap = JSON.parse(localStorage.getItem(`shadow_attempts_${todayKey}`) || '{}') as Record<string, number>
                            const next = { ...attemptsMap, [curId]: (attemptsMap[curId] || 0) + 1 }
                            localStorage.setItem(`shadow_attempts_${todayKey}`, JSON.stringify(next))
                            setAttemptsForCurrent(next[curId])

                            const uniqueArr = JSON.parse(localStorage.getItem(`shadow_unique_${todayKey}`) || '[]') as string[]
                            const uniqueSet = new Set(uniqueArr)
                            if (!uniqueSet.has(curId)) {
                              uniqueSet.add(curId)
                              localStorage.setItem(`shadow_unique_${todayKey}`, JSON.stringify(Array.from(uniqueSet)))
                            }
                          }
                        } catch { }
                        mediaRecorderRef.current = mr
                        mr.start()
                        setRecording(true)
                        // 启动10秒倒计时与自动结束
                        setCountdown(10)
                        if (countdownIntervalRef.current) { window.clearInterval(countdownIntervalRef.current) }
                        countdownIntervalRef.current = window.setInterval(() => {
                          setCountdown(prev => {
                            if (prev <= 1) {
                              if (countdownIntervalRef.current) { window.clearInterval(countdownIntervalRef.current); countdownIntervalRef.current = null }
                              return 0
                            }
                            return prev - 1
                          })
                        }, 1000)
                        if (autoStopTimeoutRef.current) { window.clearTimeout(autoStopTimeoutRef.current) }
                        autoStopTimeoutRef.current = window.setTimeout(() => {
                          try { mediaRecorderRef.current?.stop() } catch { }
                          setRecording(false)
                          if (countdownIntervalRef.current) { window.clearInterval(countdownIntervalRef.current); countdownIntervalRef.current = null }
                          setCountdown(0)
                        }, 10000)
                      }}
                      className="px-4 py-4 rounded-full bg-blue-600 text-white disabled:opacity-50 flex justify-center items-center cursor-pointer"
                    >
                      <Mic className={`w-7 h-7`} />
                    </button>
                    <p className="text-sm text-gray-500">点击开始跟读</p>
                    {attemptsForCurrent >= 3 && (
                      <p className="text-sm text-red-600">每个句子跟读次数最多 3 次</p>
                    )}
                  </div>
                }

                {
                  recording &&
                  <div className='flex flex-col justify-center items-center gap-1'>
                    <div className='flex items-center gap-4'>
                      <div className="vu-bars left">
                        <span className="vu-bar" style={{ height: '2px' }} />
                        <span className="vu-bar" style={{ height: '5px' }} />
                        <span className="vu-bar" style={{ height: '7px' }} />
                        <span className="vu-bar" style={{ height: '9px' }} />
                        <span className="vu-bar" style={{ height: '12px' }} />
                        <span className="vu-bar" style={{ height: '15px' }} />
                        <span className="vu-bar" style={{ height: '18px' }} />
                        <span className="vu-bar" style={{ height: '15px' }} />
                        <span className="vu-bar" style={{ height: '12px' }} />
                        <span className="vu-bar" style={{ height: '9px' }} />
                        <span className="vu-bar" style={{ height: '7px' }} />
                        <span className="vu-bar" style={{ height: '5px' }} />
                        <span className="vu-bar" style={{ height: '2px' }} />
                      </div>
                      <div className="relative">
                        <svg
                          width={RING_SIZE}
                          height={RING_SIZE}
                          viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
                          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10"
                        >
                          {/* 进度弧：顺时针方向缩短 */}
                          <circle
                            cx={RING_SIZE / 2}
                            cy={RING_SIZE / 2}
                            r={R}
                            stroke="#ff8908" /* orange-400 */
                            strokeWidth={STROKE_WIDTH}
                            fill="none"
                            strokeDasharray={`${arcLen} ${C}`}
                            strokeLinecap="round"
                            transform={`translate(${RING_SIZE} 0) scale(-1 1) rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
                          />
                        </svg>
                        <button
                          disabled={!recording}
                          onClick={stopRecording}
                          className="px-4 py-4 rounded-full bg-orange-400 text-white flex justify-center items-center cursor-pointer relative"
                          style={{ width: BUTTON_SIZE, height: BUTTON_SIZE }}
                        >
                          <Square fill='white' className={`w-7 h-7`} />
                        </button>
                      </div>
                      <div className="vu-bars right">
                        <span className="vu-bar" style={{ height: '2px' }} />
                        <span className="vu-bar" style={{ height: '5px' }} />
                        <span className="vu-bar" style={{ height: '7px' }} />
                        <span className="vu-bar" style={{ height: '9px' }} />
                        <span className="vu-bar" style={{ height: '12px' }} />
                        <span className="vu-bar" style={{ height: '15px' }} />
                        <span className="vu-bar" style={{ height: '18px' }} />
                        <span className="vu-bar" style={{ height: '15px' }} />
                        <span className="vu-bar" style={{ height: '12px' }} />
                        <span className="vu-bar" style={{ height: '9px' }} />
                        <span className="vu-bar" style={{ height: '7px' }} />
                        <span className="vu-bar" style={{ height: '5px' }} />
                        <span className="vu-bar" style={{ height: '2px' }} />
                      </div>
                    </div>
                    <p className="text-sm text-gray-500">点击结束录音{countdown > 0 ? ` · 还剩 ${countdown}s` : ''}</p>
                  </div>
                }

                {evaluating && <span className="text-sm text-gray-500">评测中...</span>}
                {micError && <span className="text-sm text-red-600">{micError}</span>}
              </div>

              {/* 评测结果展示（PC 风格） */}
              {evalResult && (
                <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* 总览卡片 */}
                  <div className="col-span-1 p-5 rounded-xl border bg-white dark:bg-gray-900">
                    <div className="font-medium mb-3">句子整体得分</div>
                    <div className='flex justify-center items-center gap-3'>
                      <div className='flex flex-col justify-center items-center'>
                        <div className="text-5xl font-extrabold">{typeof (evalResult?.score) === 'number' ? Math.round(evalResult?.score as number) : '--'}</div>
                        <div className="text-gray-500 mt-1 text-base">总分</div>
                      </div>
                      <div
                        className='px-2 py-1 bg-gray-200 dark:text-black cursor-pointer text-base flex items-center justify-center gap-1 rounded-full'
                        onClick={() => {
                          if (!recordedUrl || !recAudioRef.current) return
                          try {
                            recAudioRef.current.src = recordedUrl
                            recAudioRef.current.currentTime = 0
                            recAudioRef.current.play().catch(() => { })
                          } catch { }
                        }}
                      >
                        <CirclePlay className={`w-5 h-5 cursor-pointe`} />
                        <span>回放</span>
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-3 text-center">
                      <div>
                        <div className="text-2xl font-semibold">{formatScore((evalResult?.lines?.[0] as EvalLine | undefined)?.pronunciation ?? 0)}</div>
                        <div className="text-sm text-gray-500">准确</div>
                      </div>
                      <div>
                        <div className="text-2xl font-semibold">{formatScore((evalResult?.lines?.[0] as EvalLine | undefined)?.fluency ?? 0)}</div>
                        <div className="text-sm text-gray-500">流利</div>
                      </div>
                      <div>
                        <div className="text-2xl font-semibold">{formatScore((evalResult?.lines?.[0] as EvalLine | undefined)?.integrity ?? 0)}</div>
                        <div className="text-sm text-gray-500">完整</div>
                      </div>
                    </div>
                  </div>

                  {/* 句子整体表现（按词着色） */}
                  <div className="col-span-2 p-5 rounded-xl border bg-white dark:bg-gray-900 relative">
                    <div className="font-semibold mb-3">句子整体表现</div>
                    <div className="text-4xl leading-10 text-center">
                      {(evalResult?.lines?.[0]?.words as EvalWord[] | undefined)?.map((w, idx: number) => {
                        const sc = Number(w.score ?? 0)
                        const color = w.type === 7
                          ? 'text-black'
                          : (sc === 0
                            ? 'text-black'
                            : (sc >= 8.5 ? 'text-green-600' : sc >= 6 ? 'text-yellow-600' : 'text-red-600'))
                        return <span key={idx} className={`${color}`}>{w.text}</span>
                      })}
                    </div>
                    <div className="mt-2 text-sm text-gray-500 flex items-center gap-4 absolute right-4 bottom-4">
                      <span className="inline-flex items-center"><span className="w-3 h-3 bg-green-600 inline-block mr-1 rounded-full"></span>很好</span>
                      <span className="inline-flex items-center"><span className="w-3 h-3 bg-yellow-600 inline-block mr-1 rounded-full"></span>良好</span>
                      <span className="inline-flex items-center"><span className="w-3 h-3 bg-red-600 inline-block mr-1 rounded-full"></span>较差</span>
                      <span className="inline-flex items-center"><span className="w-3 h-3 bg-black inline-block mr-1 rounded-full"></span>漏读/错读</span>
                    </div>
                  </div>

                  {/* 单词明细表 */}
                  <div className="col-span-3 p-5 rounded-xl border bg-white dark:bg-gray-900">
                    <div className="font-semibold mb-3">句子单词表现</div>
                    <div className="overflow-x-auto">
                      <table className="min-w-[600px] w-full text-sm">
                        <thead>
                          <tr className="text-left text-gray-600">
                            <th className="py-2 pr-4">单词</th>
                            <th className="py-2 pr-4">音标</th>
                            <th className="py-2 pr-4">分数</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(evalResult?.lines?.[0]?.words as EvalWord[] | undefined)?.filter(w => w.type !== 7)?.map((w, idx: number) => (
                            <tr key={idx} className="border-t">
                              <td className="py-2 pr-4">{w.text}</td>
                              <td className="py-2 pr-4">/{w.phonetic || '-'}/</td>
                              <td className="py-2 pr-4">{formatScore(w.score ?? 0)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </AuthGuard>
      <AlertDialog.Root open={dailyLimitDialogOpen} onOpenChange={setDailyLimitDialogOpen}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 bg-black/40" />
          <AlertDialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-sm rounded-lg bg-white dark:bg-gray-900 p-5 shadow-xl border border-gray-200 dark:border-gray-800">
            <AlertDialog.Title className="text-lg font-semibold">提示</AlertDialog.Title>
            <AlertDialog.Description className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              试用阶段，每天最多跟读 <b>5</b> 个句子，请明天再来
            </AlertDialog.Description>
            <div className="mt-4 flex justify-end gap-2">
              <AlertDialog.Action asChild>
                <button
                  onClick={() => setDailyLimitDialogOpen(false)}
                  className="px-3 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700"
                >
                  我知道了
                </button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </>
  )
}
