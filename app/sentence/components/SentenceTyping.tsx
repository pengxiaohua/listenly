'use client'

import { useEffect, useState, useRef, useCallback, forwardRef, useImperativeHandle } from 'react'
// import { Volume2, Languages, BookA } from 'lucide-react'
import { toast } from "sonner"
import { isBritishAmericanVariant } from '@/lib/utils'

type SentenceSegment =
  | { type: 'word'; index: number; text: string }
  | { type: 'punctuation'; text: string }

const parseSentenceIntoSegments = (text: string) => {
  const segments: SentenceSegment[] = []
  const words: string[] = []
  if (!text) return { segments, words }

  // 常见包含句号的缩写词模式（如 a.m., p.m., Mr., Mrs., Dr., etc., i.e., e.g., U.S., U.K.）
  // 关键：只有当单词内部包含句号时（不是只在结尾），才认为是缩写词
  // 匹配格式：
  // - 字母 + 句号 + 字母 + 句号（如 a.m., p.m.）- 内部有句号
  // - 大写字母 + 句号 + 大写字母 + 句号（如 U.S., U.K.）- 内部有句号
  // - 已知的特定缩写词（如 Mr., Mrs., Dr., Ms., etc., vs., i.e., e.g.）
  const knownAbbreviations = new Set(['mr', 'mrs', 'dr', 'ms', 'etc', 'vs', 'ie', 'eg', 'prof', 'sr', 'jr'])
  const hasInternalPeriod = /[a-zA-Z]\.[a-zA-Z]/

  text.split(' ').forEach((token) => {
    if (!token) return

    let remaining = token
    let prefix = ''
    let suffix = ''

    // 检查是否是包含句号的缩写词
    // 条件1：单词内部有句号（如 a.m., U.S.）
    // 条件2：或者是已知的缩写词（如 Mr., Dr., etc.）
    const hasPeriod = remaining.includes('.')
    const internalPeriod = hasInternalPeriod.test(remaining)
    const wordWithoutPeriod = remaining.replace(/\./g, '').toLowerCase()
    const isKnownAbbreviation = knownAbbreviations.has(wordWithoutPeriod)
    const isAbbreviation = hasPeriod && (internalPeriod || isKnownAbbreviation)

    if (!isAbbreviation) {
      // 如果不是缩写词，按原来的逻辑处理前缀标点
      // 排除逗号、感叹号、问号、破折号、引号，冒号，分号，句号，左右括号
      const prefixMatch = remaining.match(/^[,\.!?\-":;()]+/)
      if (prefixMatch) {
        prefix = prefixMatch[0]
        segments.push({ type: 'punctuation', text: prefix })
        remaining = remaining.slice(prefix.length)
      }

      // 排除逗号、感叹号、问号、破折号、引号，冒号，分号，句号，左右括号
      const suffixMatch = remaining.match(/[,\.!?\-":;()]+$/)
      if (suffixMatch) {
        suffix = suffixMatch[0]
        remaining = remaining.slice(0, remaining.length - suffix.length)
      }
    } else {
      // 如果是缩写词，需要检查前后是否有其他标点符号
      // 处理前缀标点（但保留缩写词中的句号）
      const prefixMatch = remaining.match(/^[,!?\-":;()]+/)
      if (prefixMatch) {
        prefix = prefixMatch[0]
        segments.push({ type: 'punctuation', text: prefix })
        remaining = remaining.slice(prefix.length)
      }

      // 处理后缀标点（但保留缩写词中的句号）
      // 匹配除了句号之外的其他标点符号
      const suffixMatch = remaining.match(/[,!?\-":;()]+$/)
      if (suffixMatch) {
        suffix = suffixMatch[0]
        remaining = remaining.slice(0, remaining.length - suffix.length)
      }
    }

    if (remaining) {
      segments.push({
        type: 'word',
        text: remaining,
        index: words.length,
      })
      words.push(remaining)
    }

    if (suffix) {
      segments.push({ type: 'punctuation', text: suffix })
    }
  })

  return { segments, words }
}

interface SentenceTypingProps {
  corpusSlug: string
  corpusOssDir: string
  groupId: number | null
  onProgressUpdate?: () => void
  onControlStateChange?: (state: {
    isPlaying: boolean
    playbackSpeed: number
    showTranslation: boolean
    translating: boolean
    isAddingToVocabulary: boolean
    checkingVocabulary: boolean
    isInVocabulary: boolean
  }) => void
}

export interface SentenceTypingRef {
  handlePlayAudio: () => void
  handleTranslate: () => void
  handleAddToVocabulary: () => void
  setPlaybackSpeed: (speed: number) => void
  isPlaying: boolean
  playbackSpeed: number
  showTranslation: boolean
  translating: boolean
  isAddingToVocabulary: boolean
  checkingVocabulary: boolean
  isInVocabulary: boolean
}

const SentenceTyping = forwardRef<SentenceTypingRef, SentenceTypingProps>(
  ({ corpusSlug, corpusOssDir, groupId, onProgressUpdate, onControlStateChange }, ref) => {
  const [sentence, setSentence] = useState<{ id: number, text: string } | null>(null)
  const [userInput, setUserInput] = useState<string[]>([])
  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  const [audioUrl, setAudioUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [wordStatus, setWordStatus] = useState<('correct' | 'wrong' | 'pending')[]>([])
  const [translation, setTranslation] = useState<string>('')
  const [translating, setTranslating] = useState(false)
  const [showTranslation, setShowTranslation] = useState(false)
  const [currentSentenceErrorCount, setCurrentSentenceErrorCount] = useState(0)
  const [isCorpusCompleted, setIsCorpusCompleted] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isAddingToVocabulary, setIsAddingToVocabulary] = useState(false)
  const [isInVocabulary, setIsInVocabulary] = useState(false)
  const [checkingVocabulary, setCheckingVocabulary] = useState(false)
  const translationCache = useRef<Record<string, string>>({})
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [showSentence, setShowSentence] = useState(false)
  const [sentenceSegments, setSentenceSegments] = useState<SentenceSegment[]>([])
  const [parsedWords, setParsedWords] = useState<string[]>([])
  const gestureCleanupRef = useRef<null | (() => void)>(null)
  const visibilityCleanupRef = useRef<null | (() => void)>(null)
  const retryTimerRef = useRef<number | null>(null)

  // 检查当前句子是否在生词本中
  const checkVocabularyStatus = useCallback(async (sentenceId: number) => {
    setCheckingVocabulary(true);
    try {
      const response = await fetch(`/api/vocabulary/check?type=sentence&sentenceId=${sentenceId}`);
      const data = await response.json();

      if (data.success) {
        setIsInVocabulary(data.exists);
      }
    } catch (error) {
      console.error('检查生词本状态失败:', error);
    } finally {
      setCheckingVocabulary(false);
    }
  }, []);

  // 获取下一个句子
  const fetchNextSentence = useCallback(async () => {
    if (!corpusSlug || !groupId) return
    setLoading(true)

    try {
      const params = new URLSearchParams({ sentenceSet: corpusSlug })
      params.set('groupId', String(groupId))
      const res = await fetch(`/api/sentence/get?${params.toString()}`)
      const data = await res.json()

      if (data.completed) {
        setIsCorpusCompleted(true)
        setLoading(false)
        return
      }

      if (!data || !data.text) {
        throw new Error('获取句子失败')
      }

      setSentence(data)
      const { segments, words } = parseSentenceIntoSegments(data.text)
      setSentenceSegments(segments)
      setParsedWords(words)
      setUserInput(Array(words.length).fill(''))
      setWordStatus(Array(words.length).fill('pending'))
      setCurrentWordIndex(0)
      setCurrentSentenceErrorCount(0)
      setShowSentence(false)

      // 检查当前句子是否在生词本中
      if (data.id) {
        checkVocabularyStatus(data.id);
      }

      // 自动获取并显示翻译
      if (data.text) {
        // 检查缓存
        if (translationCache.current[data.text]) {
          setTranslation(translationCache.current[data.text])
          setShowTranslation(true)
        } else {
          // 自动获取翻译
          setTranslating(true)
          fetch('/api/sentence/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: data.text,
              sentenceId: data.id
            })
          })
            .then(res => res.json())
            .then(translateData => {
              if (translateData.success) {
                setTranslation(translateData.translation)
                setShowTranslation(true)
                // 缓存翻译结果
                translationCache.current[data.text] = translateData.translation
              }
            })
            .catch(error => {
              console.error('翻译请求失败:', error)
            })
            .finally(() => {
              setTranslating(false)
            })
        }
      }

      setLoading(false)
    } catch (error) {
      console.error('获取句子失败:', error)
      setLoading(false)
    }
  }, [corpusSlug, checkVocabularyStatus, groupId]);

  // 初始化时获取句子
  useEffect(() => {
    if (corpusSlug && groupId) {
      fetchNextSentence()
    }
  }, [corpusSlug, groupId, fetchNextSentence])

  // 监听sentence变化，获取MP3
  useEffect(() => {
    if (!sentence || !corpusOssDir) return

    fetch(`/api/sentence/mp3-url?sentence=${encodeURIComponent(sentence.text)}&dir=${corpusOssDir}`)
      .then(res => res.json())
      .then(mp3 => {
        setAudioUrl(mp3.url)
      })
      .catch(error => {
        console.error('获取MP3失败:', error)
      })
  }, [sentence, corpusOssDir])

  // 监听audioUrl变化，设置音频元素和自动播放（带多事件触发与回退）
  useEffect(() => {
    if (!audioUrl || !audioRef.current) return

    const audio = audioRef.current
    // 同步播放速度
    audio.playbackRate = playbackSpeed

    // 设置音频源
    audio.src = audioUrl
    audio.load()

    // 设置播放状态监听器
    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    const handleEnded = () => setIsPlaying(false)
    const handleError = () => setIsPlaying(false)

    audio.addEventListener('play', handlePlay)
    audio.addEventListener('pause', handlePause)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('error', handleError)

    // 播放尝试（含静音解锁回退、可见性解锁、用户手势回退与定时重试）
    let retryCount = 0
    const maxRetry = 3
    const scheduleRetry = () => {
      if (retryCount >= maxRetry) return
      retryCount += 1
      if (retryTimerRef.current) window.clearTimeout(retryTimerRef.current)
      retryTimerRef.current = window.setTimeout(() => {
        attemptPlay()
      }, 800)
    }

    const setupGestureFallback = () => {
      if (gestureCleanupRef.current) return
      const tryPlayAfterGesture = () => attemptPlay()
      const onPointerDown = () => tryPlayAfterGesture()
      const onKeyDown = () => tryPlayAfterGesture()
      window.addEventListener('pointerdown', onPointerDown, { once: true, capture: true })
      window.addEventListener('keydown', onKeyDown, { once: true })
      gestureCleanupRef.current = () => {
        window.removeEventListener('pointerdown', onPointerDown, { capture: true })
        window.removeEventListener('keydown', onKeyDown)
      }
    }

    const setupVisibilityFallback = () => {
      if (visibilityCleanupRef.current) return
      const onVis = () => {
        if (document.visibilityState === 'visible') {
          attemptPlay()
        }
      }
      document.addEventListener('visibilitychange', onVis)
      visibilityCleanupRef.current = () => {
        document.removeEventListener('visibilitychange', onVis)
      }
    }

    const attemptPlay = () => {
      if (!audioRef.current) return
      const el = audioRef.current
      el.play().then(() => {
        setIsPlaying(true)
        // 成功后清理一次性监听
        if (gestureCleanupRef.current) {
          gestureCleanupRef.current()
          gestureCleanupRef.current = null
        }
        if (visibilityCleanupRef.current) {
          visibilityCleanupRef.current()
          visibilityCleanupRef.current = null
        }
        if (retryTimerRef.current) {
          window.clearTimeout(retryTimerRef.current)
          retryTimerRef.current = null
        }
      }).catch(() => {
        // 若策略阻止或时序未就绪，尝试静音解锁与回退
        setIsPlaying(false)
        // 页面不可见时，等待可见
        if (document.visibilityState !== 'visible') {
          setupVisibilityFallback()
        }
        // 静音解锁一次（iOS/部分内核）
        if (!el.muted) {
          el.muted = true
          el.play().then(() => {
            // 立即切回有声播放
            setTimeout(() => {
              if (!audioRef.current) return
              audioRef.current!.pause()
              audioRef.current!.muted = false
              audioRef.current!.play().catch(() => {
                // 最后兜底：用户手势或重试
                setupGestureFallback()
                scheduleRetry()
              })
            }, 0)
          }).catch(() => {
            // 仍失败：恢复声音，等待用户手势 + 重试
            el.muted = false
            setupGestureFallback()
            scheduleRetry()
          })
        } else {
          // 已尝试静音：恢复声音，等待用户手势 + 重试
          el.muted = false
          setupGestureFallback()
          scheduleRetry()
        }
      })
    }

    // 自动播放：多事件触发，覆盖不同内核时序差异
    const handleLoadedData = () => attemptPlay()
    const handleCanPlay = () => attemptPlay()
    const handleCanPlayThrough = () => attemptPlay()

    audio.addEventListener('canplaythrough', handleCanPlayThrough)
    audio.addEventListener('canplay', handleCanPlay)
    audio.addEventListener('loadeddata', handleLoadedData)

    // 提前尝试一次（不等事件）
    attemptPlay()

    // 清理函数
    return () => {
      audio.removeEventListener('play', handlePlay)
      audio.removeEventListener('pause', handlePause)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('canplaythrough', handleCanPlayThrough)
      audio.removeEventListener('canplay', handleCanPlay)
      audio.removeEventListener('loadeddata', handleLoadedData)
      audio.removeEventListener('error', handleError)
      // 清理用户手势监听
      if (gestureCleanupRef.current) {
        gestureCleanupRef.current()
        gestureCleanupRef.current = null
      }
      // 清理可见性监听
      if (visibilityCleanupRef.current) {
        visibilityCleanupRef.current()
        visibilityCleanupRef.current = null
      }
      // 清理重试定时器
      if (retryTimerRef.current) {
        window.clearTimeout(retryTimerRef.current)
        retryTimerRef.current = null
      }
    }
  }, [audioUrl, playbackSpeed])

  // 播放速度变化时，同步到音频
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed
    }
  }, [playbackSpeed])

  // 播放打字音效
  const playTypingSound = () => {
    const audio = new Audio('/sounds/typing.mp3')
    audio.play()
  }

  // 播放正确音效
  const playCorrectSound = () => {
    const audio = new Audio('/sounds/correct.mp3')
    audio.play()
  }

  // 播放错误音效
  const playWrongSound = () => {
    const audio = new Audio('/sounds/wrong.mp3')
    audio.play()
  }

  // 记录单词错误
  const recordWordError = async () => {
    if (!sentence) return
    try {
      await fetch('/api/sentence/create-record', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sentenceId: sentence.id
        })
      })
      setCurrentSentenceErrorCount((prev: number) => prev + 1)
    } catch (error) {
      console.error('记录单词错误失败:', error)
    }
  }

  // 处理输入
  const handleInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!sentence) return
    const currentWord = parsedWords[currentWordIndex] || ''

    // 检查是否是包含句号的缩写词（与 parseSentenceIntoSegments 中的逻辑保持一致）
    const knownAbbreviations = new Set(['mr', 'mrs', 'dr', 'ms', 'etc', 'vs', 'ie', 'eg', 'prof', 'sr', 'jr'])
    const hasInternalPeriod = /[a-zA-Z]\.[a-zA-Z]/
    const hasPeriod = currentWord.includes('.')
    const internalPeriod = hasInternalPeriod.test(currentWord)
    const wordWithoutPeriod = currentWord.replace(/\./g, '').toLowerCase()
    const isKnownAbbreviation = knownAbbreviations.has(wordWithoutPeriod)
    const isAbbreviation = hasPeriod && (internalPeriod || isKnownAbbreviation)

    // 清理单词中的标点符号（对于缩写词，保留句号）
    const cleanWord = (word: string) => {
      if (isAbbreviation) {
        // 对于缩写词，只移除除句号外的其他标点符号
        return word.replace(/[,!?:;()]/g, '').toLowerCase()
      }
      return word.replace(/[.,!?:;()]/g, '').toLowerCase()
    }
    // 按空格键，显示答案
    if (e.key === ' ') {
      e.preventDefault() // 阻止空格键的默认行为
      // 显示句子
      setShowSentence(true)
    } else if (e.key === 'Enter') {
      e.preventDefault() // 阻止Enter键的默认行为
      // 空格键切换到下一个单词
      const currentInput = userInput[currentWordIndex] || ''

      // 对于缩写词，直接比较（保留句号）
      if (isAbbreviation) {
        const normalizedInput = currentInput.toLowerCase().trim()
        const normalizedTarget = currentWord.toLowerCase().trim()
        if (normalizedInput === normalizedTarget) {
          setWordStatus((prev: ('correct' | 'wrong' | 'pending')[]) => {
            const next = [...prev]
            next[currentWordIndex] = 'correct'
            return next
          })
          playCorrectSound() // 播放正确音效
          // 正确时跳转到下一个单词
          if (currentWordIndex < parsedWords.length - 1) {
            setCurrentWordIndex((prev: number) => prev + 1)
            // 使用 setTimeout 确保在状态更新后再聚焦
            setTimeout(() => {
              const inputs = document.querySelectorAll('input')
              const nextInput = inputs[currentWordIndex + 1]
              if (nextInput) {
                nextInput.focus()
              }
            }, 0)
          } else {
            // 如果是最后一个单词，自动提交整个句子
            handleSubmit(true)
            setShowSentence(false)
          }
        } else {
          setWordStatus((prev: ('correct' | 'wrong' | 'pending')[]) => {
            const next = [...prev]
            next[currentWordIndex] = 'wrong'
            return next
          })
          playWrongSound() // 播放错误音效
          recordWordError() // 记录单词错误
          // 错误时停留在当前输入框，不清空输入内容，允许用户修改
        }
        return
      }

      // 对于普通单词，检查输入长度（忽略标点符号）
      const cleanCurrentInput = cleanWord(currentInput)
      const cleanTargetWord = cleanWord(currentWord)

      // 允许长度相同或相差1（英式/美式拼写变体可能有长度差异，如 travelled/traveled）
      const lengthDiff = Math.abs(cleanCurrentInput.length - cleanTargetWord.length)
      if (lengthDiff <= 1) {
        // 输入完整，进行校验（支持英式/美式拼写兼容）
        if (cleanCurrentInput === cleanTargetWord || isBritishAmericanVariant(cleanCurrentInput, cleanTargetWord)) {
          setWordStatus((prev: ('correct' | 'wrong' | 'pending')[]) => {
            const next = [...prev]
            next[currentWordIndex] = 'correct'
            return next
          })
          playCorrectSound() // 播放正确音效
          // 正确时跳转到下一个单词
          if (currentWordIndex < parsedWords.length - 1) {
            setCurrentWordIndex((prev: number) => prev + 1)
            // 使用 setTimeout 确保在状态更新后再聚焦
            setTimeout(() => {
              const inputs = document.querySelectorAll('input')
              const nextInput = inputs[currentWordIndex + 1]
              if (nextInput) {
                nextInput.focus()
              }
            }, 0)
          } else {
            // 如果是最后一个单词，自动提交整个句子
            handleSubmit(true)
            setShowSentence(false)
          }
        } else {
          setWordStatus((prev: ('correct' | 'wrong' | 'pending')[]) => {
            const next = [...prev]
            next[currentWordIndex] = 'wrong'
            return next
          })
          playWrongSound() // 播放错误音效
          recordWordError() // 记录单词错误
          // 错误时停留在当前输入框，不清空输入内容，允许用户修改
        }
      } else {
        // 输入不完整，标记为错误并停留在当前输入框
        setWordStatus((prev: ('correct' | 'wrong' | 'pending')[]) => {
          const next = [...prev]
          next[currentWordIndex] = 'wrong'
          return next
        })
        playWrongSound() // 播放错误音效
        recordWordError() // 记录单词错误
        // 输入不完整时也停留在当前输入框
      }
    } else if (e.key === 'Backspace') {
      // 处理退格键
      const newInput = [...userInput]
      newInput[currentWordIndex] = newInput[currentWordIndex].slice(0, -1)
      setUserInput(newInput)
    } else if (e.key.length === 1) {
      // 普通字符输入（允许在光标处插入字符）
      e.preventDefault()
      const inputEl = e.currentTarget as HTMLInputElement
      const cursorStart = inputEl.selectionStart ?? 0
      const cursorEnd = inputEl.selectionEnd ?? cursorStart
      const newInput = [...userInput]
      const currentValue = newInput[currentWordIndex] || ''
      const updatedValue =
        currentValue.slice(0, cursorStart) + e.key + currentValue.slice(cursorEnd)
      newInput[currentWordIndex] = updatedValue
      setUserInput(newInput)
      window.requestAnimationFrame(() => {
        inputEl.setSelectionRange(cursorStart + 1, cursorStart + 1)
      })
      playTypingSound()
    }
  }

  // 提交答题
  const handleSubmit = async (isCorrect: boolean) => {
    if (!sentence) return
    await fetch('/api/sentence/create-record', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sentenceId: sentence.id,
        isCorrect: isCorrect,
        errorCount: currentSentenceErrorCount
      })
    })
    // 重置错误计数
    setCurrentSentenceErrorCount(0)
    // 更新进度
    if (onProgressUpdate) {
      onProgressUpdate()
    }
    // 获取下一个随机句子
    fetchNextSentence()
  }

  // 获取翻译
  const handleTranslate = useCallback(async () => {
    if (!sentence) return

    // 如果已经有翻译，只需要切换显示状态
    if (translation) {
      setShowTranslation(!showTranslation)
      return
    }

    // 检查缓存
    if (translationCache.current[sentence.text]) {
      setTranslation(translationCache.current[sentence.text])
      setShowTranslation(true)
      return
    }

    setTranslating(true)
    try {
      const response = await fetch('/api/sentence/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: sentence.text,
          sentenceId: sentence.id
        })
      })
      const data = await response.json()
      if (data.success) {
        setTranslation(data.translation)
        setShowTranslation(true)
        // 缓存翻译结果
        translationCache.current[sentence.text] = data.translation
      } else {
        console.error('翻译失败:', data.error)
      }
    } catch (error) {
      console.error('翻译请求失败:', error)
    } finally {
      setTranslating(false)
    }
  }, [sentence, translation, showTranslation])

  // 切换句子，重置生词本状态（翻译会在 fetchNextSentence 中自动获取）
  useEffect(() => {
    setIsInVocabulary(false)
    setCheckingVocabulary(false)
  }, [sentence])

  // 当控制状态变化时，通知父组件（替代定时轮询）
  useEffect(() => {
    if (onControlStateChange) {
      onControlStateChange({
        isPlaying,
        playbackSpeed,
        showTranslation,
        translating,
        isAddingToVocabulary,
        checkingVocabulary,
        isInVocabulary,
      })
    }
  }, [isPlaying, playbackSpeed, showTranslation, translating, isAddingToVocabulary, checkingVocabulary, isInVocabulary, onControlStateChange])

  // 添加到生词本
  const handleAddToVocabulary = useCallback(async () => {
    if (!sentence?.id) return;

    setIsAddingToVocabulary(true);
    try {
      const response = await fetch('/api/vocabulary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'sentence',
          sentenceId: sentence.id,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success('已添加到生词本！');
        setIsInVocabulary(true); // 更新状态
      } else if (response.status === 409) {
        toast.error('该句子已在生词本中');
        setIsInVocabulary(true); // 同步状态
      } else {
        toast.error(data.error || '添加失败');
      }
    } catch (error) {
      console.error('添加到生词本失败:', error);
      toast.error('添加失败，请重试');
    } finally {
      setIsAddingToVocabulary(false);
    }
  }, [sentence?.id]);

  // 播放音频处理函数
  const handlePlayAudio = useCallback(() => {
    if (!audioRef.current) return

    const audio = audioRef.current

    // 设置播放速度
    audio.playbackRate = playbackSpeed

    // 播放音频
    audio.muted = false
    audio.play().catch(err => {
      console.error('播放失败:', err)
      setIsPlaying(false)
    })
  }, [playbackSpeed])

  // 暴露方法和状态给父组件
  useImperativeHandle(ref, () => ({
    handlePlayAudio,
    handleTranslate,
    handleAddToVocabulary,
    setPlaybackSpeed,
    isPlaying,
    playbackSpeed,
    showTranslation,
    translating,
    isAddingToVocabulary,
    checkingVocabulary,
    isInVocabulary,
  }), [handlePlayAudio, handleTranslate, handleAddToVocabulary, playbackSpeed, isPlaying, showTranslation, translating, isAddingToVocabulary, checkingVocabulary, isInVocabulary])

  return (
    <>
      <audio
        ref={audioRef}
        preload="auto"
        autoPlay
        playsInline
        style={{ display: 'none' }}
      />
      <div className='flex flex-col items-center h-[calc(100vh-300px)] justify-center relative'>
        {isCorpusCompleted ? (
          <div className="text-2xl font-bold text-green-600">
            恭喜！你已完成这一组所有句子！
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <span className="ml-2">加载中...</span>
          </div>
        ) : (
          <div className='relative'>
            {showSentence && (
              <div className="text-3xl font-base mb-8 absolute top-[-64px] left-0 w-full flex justify-center items-center">
                {sentence?.text}
              </div>
            )}
            <div className="flex flex-wrap gap-2 text-2xl mt-8 mb-4 relative items-center">
              {sentenceSegments.map((segment, idx) => {
                if (segment.type === 'punctuation') {
                  return (
                    <div
                      key={`punct-${idx}`}
                      className="self-center mb-6 text-3xl font-semibold text-gray-600 px-1"
                    >
                      {segment.text}
                    </div>
                  )
                }

                const minWidth = 2
                const paddingWidth = 1
                const width = Math.max(minWidth, segment.text.length + paddingWidth)
                const isCurrentWord = segment.index === currentWordIndex
                const currentStatus = wordStatus[segment.index]

                return (
                  <div key={`word-${segment.index}-${idx}`} className="relative mb-3">
                    <input
                      type="text"
                      name={`word-${segment.index}`}
                      id={`word-input-${segment.index}`}
                      autoComplete="off"
                      value={userInput[segment.index] || ''}
                      onChange={() => {}}
                      onKeyDown={handleInput}
                      className={`border-b-3 text-center font-medium text-3xl focus:outline-none ${
                        isCurrentWord && currentStatus === 'pending'
                          ? 'border-blue-500 text-blue-500'
                          : currentStatus === 'correct'
                            ? 'border-green-500 text-green-500'
                            : currentStatus === 'wrong'
                              ? 'border-red-500 text-red-500'
                              : 'border-gray-300'
                        }`}
                      style={{
                        width: `${width * 0.8}em`,
                        minWidth: `${width * 0.7}em`,
                        // padding: '0 0.5em'
                      }}
                      disabled={segment.index !== currentWordIndex}
                      autoFocus={segment.index === currentWordIndex}
                    />
                  </div>
                )
              })}
              {showTranslation && translation && (
                <div className="mt-4 text-gray-600 text-2xl absolute bottom-[-40px] left-0 w-full text-center">
                  {translation}
                </div>
              )}
            </div>
            {/* 添加按键说明区域 */}
            <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-100 rounded-lg p-4 shadow-md w-[90%] max-w-xl">
              <div className=" text-gray-600 flex flex-col sm:flex-row justify-center items-center gap-4">
                <div className="w-full sm:w-auto">
                  <kbd className="inline-block px-10 py-2 bg-white border-2 border-gray-300 rounded-md shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] active:shadow-[0px_0px_0px_0px_rgba(0,0,0,0.1)] active:translate-y-[2px] active:translate-x-[2px] transition-all">
                    <div className="text-sm -mb-1">空格</div>
                  </kbd>
                  <span className="ml-2 text-sm text-gray-500">空格键：查看答案</span>
                </div>
                <div className="w-full sm:w-auto">
                  <kbd className="inline-block px-4 py-2 bg-white border-2 border-gray-300 rounded-md shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] active:shadow-[0px_0px_0px_0px_rgba(0,0,0,0.1)] active:translate-y-[2px] active:translate-x-[2px] transition-all">
                    <div className="flex items-center">
                      <svg className="w-4 h-4 ml-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M20 4V10C20 11.0609 19.5786 12.0783 18.8284 12.8284C18.0783 13.5786 17.0609 14 16 14H4M4 14L8 10M4 14L8 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </kbd>
                  <span className="ml-2 text-sm text-gray-500">回车键：校验单词是否正确</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
})

SentenceTyping.displayName = 'SentenceTyping'

export default SentenceTyping

