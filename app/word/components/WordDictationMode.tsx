'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { ChevronLeft, Pause, Play, SkipForward, List } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useUserConfigStore } from '@/store/userConfig'
import { getVoiceSuffix, fetchTtsAudio } from '@/lib/useTtsAudio'

interface Word {
  id: string
  word: string
  translation: string
  phoneticUS: string
  phoneticUK: string
  definition: string
  category: string
}

interface WordDictationModeProps {
  words: Word[]
  setName?: string
  groupName?: string
  onBack: () => void
  onComplete: () => void
  wordSetSlug: string
  audioRef: React.RefObject<HTMLAudioElement | null>
}

// State machine phases:
// 'loading'    → fetching audio URL for current word
// 'playing'    → audio is playing (repeat N times with 1s gap)
// 'interval'   → countdown between words
// 'completed'  → all words done
// 'paused'     → user paused (remembers previous phase)
type Phase = 'loading' | 'playing' | 'interval' | 'completed' | 'paused'

export default function WordDictationMode({
  words,
  setName,
  groupName,
  onBack,
  onComplete,
  wordSetSlug,
  audioRef,
}: WordDictationModeProps) {
  const config = useUserConfigStore(state => state.config)
  const playCount = config.learning.dictationPlayCount ?? 2
  const interval = config.learning.dictationInterval ?? 3
  const voiceId = config.learning.voiceId ?? 'default'
  const voiceSpeed = config.learning.voiceSpeed ?? 1

  const [wordIndex, setWordIndex] = useState(0)
  const [repeatIndex, setRepeatIndex] = useState(0)
  const [phase, setPhase] = useState<Phase>('loading')
  const [countdown, setCountdown] = useState(0)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [isPlayingAudio, setIsPlayingAudio] = useState(false)

  // 复用父组件传入的 audioRef（父页面的 DOM <audio> 元素）
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const prevPhaseRef = useRef<Phase>('loading')
  const gestureCleanupRef = useRef<(() => void) | null>(null)
  const visibilityCleanupRef = useRef<(() => void) | null>(null)
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [showWordList, setShowWordList] = useState(false)

  const clearTimer = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
  }, [])
  const clearCountdown = useCallback(() => {
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null }
  }, [])
  const cleanupFallbacks = useCallback(() => {
    if (gestureCleanupRef.current) { gestureCleanupRef.current(); gestureCleanupRef.current = null }
    if (visibilityCleanupRef.current) { visibilityCleanupRef.current(); visibilityCleanupRef.current = null }
    if (retryTimerRef.current) { clearTimeout(retryTimerRef.current); retryTimerRef.current = null }
  }, [])
  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
    setIsPlayingAudio(false)
    cleanupFallbacks()
  }, [cleanupFallbacks])

  // Fetch audio URL when wordIndex changes or phase is 'loading'
  useEffect(() => {
    if (phase !== 'loading') return
    if (wordIndex >= words.length) { setPhase('completed'); return }

    let cancelled = false
    const word = words[wordIndex]
    const dir = `words/${wordSetSlug}`
    const voiceSuffix = getVoiceSuffix(voiceId)
    const voiceParam = voiceSuffix ? `&voiceSuffix=${encodeURIComponent(voiceSuffix)}` : ''

    fetch(`/api/word/mp3-url?word=${encodeURIComponent(word.word)}&dir=${dir}${voiceParam}`)
      .then(res => res.json())
      .then(async (mp3) => {
        if (cancelled) return
        let url = ''
        if (mp3?.url) {
          url = mp3.url
        } else if (mp3?.needGenerate && voiceSuffix) {
          try {
            url = await fetchTtsAudio({ text: word.word, voiceId, type: 'word', targetId: word.id, ossDir: dir })
          } catch { /* ignore */ }
        }
        if (!cancelled) {
          setAudioUrl(url)
          setRepeatIndex(0)
          setPhase('playing')
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAudioUrl('')
          setRepeatIndex(0)
          setPhase('playing')
        }
      })

    return () => { cancelled = true }
  }, [phase, wordIndex, words, wordSetSlug, voiceId])

  // Play audio when phase is 'playing'
  // 采用与 SentenceTyping 一致的播放策略：含静音解锁、用户手势回退、可见性回退与定时重试
  useEffect(() => {
    if (phase !== 'playing') return

    // All repeats done → go to interval or complete
    if (repeatIndex >= playCount) {
      if (wordIndex < words.length - 1) {
        setCountdown(interval)
        setPhase('interval')
      } else {
        setPhase('completed')
      }
      return
    }

    if (!audioUrl) {
      timerRef.current = setTimeout(() => {
        setRepeatIndex(prev => prev + 1)
      }, 500)
      return () => clearTimer()
    }

    const audio = audioRef.current
    if (!audio) return

    // 设置音频源
    audio.playbackRate = voiceSpeed
    audio.src = audioUrl
    audio.load()

    let done = false
    const finish = () => {
      if (done) return
      done = true
      clearTimer()
      cleanupFallbacks()
      setIsPlayingAudio(false)
      if (repeatIndex < playCount - 1) {
        timerRef.current = setTimeout(() => {
          setRepeatIndex(prev => prev + 1)
        }, 1000)
      } else {
        setRepeatIndex(prev => prev + 1)
      }
    }

    const handleEnded = () => finish()
    const handleError = () => finish()
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('error', handleError)

    // 播放尝试（含静音解锁回退、可见性解锁、用户手势回退与定时重试）
    let retryCount = 0
    const maxRetry = 3

    const scheduleRetry = () => {
      if (retryCount >= maxRetry || done) return
      retryCount += 1
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
      retryTimerRef.current = setTimeout(() => attemptPlay(), 800)
    }

    const setupGestureFallback = () => {
      if (gestureCleanupRef.current || done) return
      const tryPlay = () => { if (!done) attemptPlay() }
      window.addEventListener('pointerdown', tryPlay, { once: true, capture: true })
      window.addEventListener('keydown', tryPlay, { once: true })
      gestureCleanupRef.current = () => {
        window.removeEventListener('pointerdown', tryPlay, { capture: true })
        window.removeEventListener('keydown', tryPlay)
      }
    }

    const setupVisibilityFallback = () => {
      if (visibilityCleanupRef.current || done) return
      const onVis = () => { if (document.visibilityState === 'visible' && !done) attemptPlay() }
      document.addEventListener('visibilitychange', onVis)
      visibilityCleanupRef.current = () => document.removeEventListener('visibilitychange', onVis)
    }

    const attemptPlay = () => {
      if (done || !audioRef.current) return
      const el = audioRef.current
      el.playbackRate = voiceSpeed
      el.play().then(() => {
        if (done) return
        setIsPlayingAudio(true)
        cleanupFallbacks()
        // Set fallback timeout based on duration
        if (!done && el.duration && isFinite(el.duration)) {
          const ms = (el.duration / voiceSpeed + 1.5) * 1000
          timerRef.current = setTimeout(finish, ms)
        } else if (!done) {
          timerRef.current = setTimeout(finish, 6000)
        }
      }).catch(() => {
        if (done) return
        setIsPlayingAudio(false)
        if (document.visibilityState !== 'visible') {
          setupVisibilityFallback()
        }
        // 静音解锁一次（iOS/部分内核）
        if (!el.muted) {
          el.muted = true
          el.play().then(() => {
            if (done) return
            setTimeout(() => {
              if (done || !audioRef.current) return
              audioRef.current.pause()
              audioRef.current.muted = false
              audioRef.current.play().catch(() => {
                if (!done) { setupGestureFallback(); scheduleRetry() }
              })
            }, 0)
          }).catch(() => {
            if (done) return
            el.muted = false
            setupGestureFallback()
            scheduleRetry()
          })
        } else {
          el.muted = false
          setupGestureFallback()
          scheduleRetry()
        }
      })
    }

    // 多事件触发，覆盖不同内核时序差异
    const handleCanPlay = () => attemptPlay()
    audio.addEventListener('canplaythrough', handleCanPlay)
    audio.addEventListener('canplay', handleCanPlay)
    audio.addEventListener('loadeddata', handleCanPlay)

    // 提前尝试一次
    attemptPlay()

    return () => {
      done = true
      clearTimer()
      cleanupFallbacks()
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('error', handleError)
      audio.removeEventListener('canplaythrough', handleCanPlay)
      audio.removeEventListener('canplay', handleCanPlay)
      audio.removeEventListener('loadeddata', handleCanPlay)
      audio.pause()
      audio.currentTime = 0
      setIsPlayingAudio(false)
    }
  }, [phase, repeatIndex, playCount, audioUrl, voiceSpeed, wordIndex, words.length, interval, clearTimer, cleanupFallbacks])

  // Countdown timer for interval phase
  useEffect(() => {
    if (phase !== 'interval') return

    let remaining = countdown
    countdownRef.current = setInterval(() => {
      remaining -= 1
      setCountdown(remaining)
      if (remaining <= 0) {
        clearCountdown()
        setWordIndex(prev => prev + 1)
        setPhase('loading')
      }
    }, 1000)

    return () => clearCountdown()
  }, [phase, countdown, clearCountdown])

  // Handle completion
  useEffect(() => {
    if (phase === 'completed') {
      onComplete()
    }
  }, [phase, onComplete])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAudio()
      clearTimer()
      clearCountdown()
    }
  }, [stopAudio, clearTimer, clearCountdown])

  const handlePauseToggle = () => {
    if (phase === 'paused') {
      const prev = prevPhaseRef.current
      if (prev === 'playing') {
        setPhase('playing')
      } else if (prev === 'interval') {
        setPhase('interval')
      } else {
        setPhase(prev)
      }
    } else {
      prevPhaseRef.current = phase
      stopAudio()
      clearTimer()
      clearCountdown()
      setPhase('paused')
    }
  }

  const handleSkip = () => {
    stopAudio()
    clearTimer()
    clearCountdown()
    setCountdown(0)
    if (wordIndex + 1 >= words.length) {
      setPhase('completed')
    } else {
      setWordIndex(prev => prev + 1)
      setPhase('loading')
    }
  }

  const isCompleted = phase === 'completed'
  const progressPercent = words.length > 0 ? ((wordIndex + (isCompleted ? 1 : 0)) / words.length) * 100 : 0

  const ringSize = 120
  const strokeWidth = 6
  const radius = (ringSize - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const countdownProgress = phase === 'interval' && countdown > 0 ? (countdown / interval) : 0
  const strokeDashoffset = circumference * (1 - countdownProgress)

  return (
    <div className="flex flex-col items-center min-h-[60vh] md:min-h-[70vh]">
        <div className="w-full flex items-center justify-between mb-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <button onClick={onBack} className="px-2 py-2 bg-slate-200 dark:bg-slate-800 rounded-full cursor-pointer hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors">
                <ChevronLeft className="w-6 h-6" />
              </button>
            </TooltipTrigger>
            <TooltipContent>返回</TooltipContent>
          </Tooltip>
          {setName && (
            <div className="flex-1 min-w-0 text-center">
              <span className="text-sm text-slate-500 truncate block">
                {setName}{groupName ? ` / ${groupName}` : ''}
              </span>
            </div>
          )}
          <div className="w-10" />
        </div>

        <div className="w-full mb-2">
          <Progress value={progressPercent} className="w-full h-2" />
          <div className="flex justify-between items-center mt-1">
            <span className="text-sm text-slate-600">进度</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowWordList(true)}
                className="text-xs text-indigo-500 hover:text-indigo-600 flex items-center gap-0.5 cursor-pointer"
              >
                <List className="w-3.5 h-3.5" />
                <span>查看词汇</span>
              </button>
              <span className="text-sm text-slate-600">{Math.min(wordIndex + 1, words.length)} / {words.length}</span>
            </div>
          </div>
        </div>

        {/* 词汇列表弹窗 */}
        <Dialog open={showWordList} onOpenChange={setShowWordList}>
          <DialogContent className="md:max-w-md max-h-[80vh] px-3 py-4 md:px-6 md:py-6">
            <DialogHeader>
              <DialogTitle>全部词汇（{words.length}）</DialogTitle>
            </DialogHeader>
            <div className="overflow-y-auto max-h-[60vh] -mx-1">
              {words.map((w, i) => (
                <div
                  key={w.id}
                  className={`flex items-center justify-between px-3 py-2 rounded-md ${i === wordIndex ? 'bg-indigo-50 dark:bg-indigo-950/30' : ''}`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs text-slate-400 w-5 shrink-0">{i + 1}</span>
                    <span className="text-sm font-medium truncate">{w.word}</span>
                  </div>
                  <span className="text-xs text-slate-500 truncate ml-2 max-w-[50%] text-right">{w.translation}</span>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        <div className="flex-1 flex flex-col items-center justify-center gap-6 py-8">
          {isCompleted ? (
            <div className="text-xl md:text-2xl font-bold text-emerald-600 flex flex-col items-center gap-6">
              <div>播报听写完成！</div>
              <button onClick={onBack} className="px-6 py-2 bg-indigo-500 hover:bg-indigo-600 rounded-lg text-white text-base font-medium transition-colors cursor-pointer">
                返回
              </button>
            </div>
          ) : (
            <>
              <div className="relative flex items-center justify-center">
                <svg width={ringSize} height={ringSize} className="transform -rotate-90">
                  <circle cx={ringSize / 2} cy={ringSize / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={strokeWidth} className="text-slate-200 dark:text-slate-700" />
                  <circle cx={ringSize / 2} cy={ringSize / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} className="text-indigo-500 transition-all duration-1000 ease-linear" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  {phase === 'interval' && countdown > 0 ? (
                    <span className="text-3xl font-bold text-indigo-500">{countdown}</span>
                  ) : isPlayingAudio ? (
                    <div className="flex items-center gap-1">
                      <span className="w-1.5 h-4 bg-indigo-500 rounded-full animate-pulse" />
                      <span className="w-1.5 h-6 bg-indigo-500 rounded-full animate-pulse delay-75" />
                      <span className="w-1.5 h-4 bg-indigo-500 rounded-full animate-pulse delay-150" />
                    </div>
                  ) : phase === 'paused' ? (
                    <span className="text-sm text-slate-400">已暂停</span>
                  ) : (
                    <span className="text-sm text-slate-400">准备中</span>
                  )}
                </div>
              </div>

              <div className="text-lg text-slate-500">
                第 <span className="text-2xl font-bold text-slate-800 dark:text-slate-200">{wordIndex + 1}</span> 个单词
              </div>

              <div className="flex items-center gap-4">
                <button onClick={handlePauseToggle} className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-indigo-500 hover:bg-indigo-600 text-white flex items-center justify-center cursor-pointer transition-colors">
                  {phase === 'paused' ? <Play className="w-6 h-6" /> : <Pause className="w-6 h-6" />}
                </button>
                <button onClick={handleSkip} className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 flex items-center justify-center cursor-pointer transition-colors">
                  <SkipForward className="w-5 h-5" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
  )
}
