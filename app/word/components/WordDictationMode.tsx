'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { ChevronLeft, Pause, Play, SkipForward } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
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

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const prevPhaseRef = useRef<Phase>('loading')

  const clearTimer = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
  }, [])
  const clearCountdown = useCallback(() => {
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null }
  }, [])
  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.removeAttribute('src')
      audioRef.current = null
    }
    setIsPlayingAudio(false)
  }, [])

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
      // No audio, skip to next repeat
      timerRef.current = setTimeout(() => {
        setRepeatIndex(prev => prev + 1)
      }, 500)
      return () => clearTimer()
    }

    const audio = new Audio(audioUrl)
    audioRef.current = audio
    audio.playbackRate = voiceSpeed

    let done = false
    const finish = () => {
      if (done) return
      done = true
      clearTimer()
      setIsPlayingAudio(false)
      // After this repeat ends, wait 1s then go to next repeat
      if (repeatIndex < playCount - 1) {
        timerRef.current = setTimeout(() => {
          setRepeatIndex(prev => prev + 1)
        }, 1000)
      } else {
        // Last repeat done
        setRepeatIndex(prev => prev + 1)
      }
    }

    audio.addEventListener('ended', finish)
    audio.addEventListener('error', finish)

    setIsPlayingAudio(true)
    audio.play().then(() => {
      // Set fallback based on duration
      if (!done && audio.duration && isFinite(audio.duration)) {
        const ms = (audio.duration / voiceSpeed + 1.5) * 1000
        timerRef.current = setTimeout(finish, ms)
      } else if (!done) {
        timerRef.current = setTimeout(finish, 6000)
      }
    }).catch(finish)

    return () => {
      done = true
      clearTimer()
      audio.pause()
      audio.removeAttribute('src')
      setIsPlayingAudio(false)
    }
  }, [phase, repeatIndex, playCount, audioUrl, voiceSpeed, wordIndex, words.length, interval, clearTimer])

  // Countdown timer for interval phase
  useEffect(() => {
    if (phase !== 'interval') return

    let remaining = countdown
    countdownRef.current = setInterval(() => {
      remaining -= 1
      setCountdown(remaining)
      if (remaining <= 0) {
        clearCountdown()
        // Move to next word
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
      // Resume
      const prev = prevPhaseRef.current
      if (prev === 'playing') {
        // Re-trigger playing by setting phase back
        setPhase('playing')
      } else if (prev === 'interval') {
        setPhase('interval')
      } else {
        setPhase(prev)
      }
    } else {
      // Pause
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
          <span className="text-sm text-slate-600">{Math.min(wordIndex + 1, words.length)} / {words.length}</span>
        </div>
      </div>

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
