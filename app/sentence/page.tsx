'use client'

import { useEffect, useState, useRef } from 'react'
import { Volume2, Languages } from 'lucide-react'

import AuthGuard from '@/components/auth/AuthGuard'

export default function SentencePage() {
  const [corpora, setCorpora] = useState<{ id: number, name: string, description?: string, ossDir: string }[]>([])
  const [corpusId, setCorpusId] = useState<number | null>(null)
  const [corpusOssDir, setCorpusOssDir] = useState<string>('')
  const [corpusName, setCorpusName] = useState<string>('')
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
  const [progress, setProgress] = useState<{ total: number, completed: number } | null>(null)
  const translationCache = useRef<Record<string, string>>({})
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // 获取语料库列表
  useEffect(() => {
    fetch('/api/sentence/corpus')
      .then(res => res.json())
      .then(data => {
        setCorpora(data)
      })
  }, [])

  // 获取进度
  const fetchProgress = async () => {
    if (!corpusId) return
    try {
      const res = await fetch(`/api/sentence/stats?corpusId=${corpusId}`)
      const data = await res.json()
      setProgress(data)
    } catch (error) {
      console.error('获取进度失败:', error)
    }
  }

  // 选择语料库后获取一个随机未完成的句子
  useEffect(() => {
    if (!corpusId) return
    const corpus = corpora.find((c: { id: number }) => c.id === corpusId)
    setCorpusName(corpus?.name || '')
    setCorpusOssDir(corpus?.ossDir || '')
    fetchNextSentence()
    fetchProgress()
  }, [corpusId])

  // 获取下一个句子
  const fetchNextSentence = async () => {
    if (corpusId === null) return
    setLoading(true)
    try {
      const res = await fetch(`/api/sentence/get?corpusId=${corpusId}`)
      const data = await res.json()

      if (data.completed) {
        setIsCorpusCompleted(true)
        setLoading(false)
        return
      }

      if (!data || !data.text) {
        throw new Error('获取句子失败')
      }

      console.log({data})

      setSentence(data)
      setUserInput(Array(data.text.split(' ').length).fill(''))
      setWordStatus(Array(data.text.split(' ').length).fill('pending'))
      setCurrentWordIndex(0)
      setCurrentSentenceErrorCount(0)
      setLoading(false)

      // 获取音频
      fetch(`/api/sentence/mp3-url?sentence=${encodeURIComponent(data.text)}&dir=${corpusOssDir}`)
        .then(res => res.json())
        .then(mp3 => {
          console.log({mp3})
          setAudioUrl(mp3.url)
          // 确保音频加载完成后自动播放
          if (audioRef.current) {
            audioRef.current.load() // 重新加载音频
            audioRef.current.oncanplaythrough = () => {
              audioRef.current?.play()
            }
          }
        })
    } catch (error) {
      console.error('获取句子失败:', error)
      setLoading(false)
    }
  }

  // 监听sentence变化，获取MP3
  useEffect(() => {
    if (!sentence || !corpusOssDir) return

    fetch(`/api/sentence/mp3-url?sentence=${encodeURIComponent(sentence.text)}&dir=${corpusOssDir}`)
      .then(res => res.json())
      .then(mp3 => {
        console.log('加载MP3:', mp3)
        setAudioUrl(mp3.url)
        if (audioRef.current) {
          audioRef.current.load()
          // 自动播放第一个句子的音频
          audioRef.current.oncanplaythrough = () => {
            audioRef.current?.play()
          }
        }
      })
      .catch(error => {
        console.error('获取MP3失败:', error)
      })
  }, [sentence, corpusOssDir])

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
      await fetch('/api/sentence/record', {
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
    const words = sentence.text.split(' ')
    const currentWord = words[currentWordIndex]

    // 清理单词中的标点符号
    const cleanWord = (word: string) => {
      return word.replace(/[.,!?:;()]/g, '').toLowerCase()
    }

    if (e.key === 'Enter') {
      // 提交整个句子
      const isCorrect = userInput.join(' ').toLowerCase() === sentence.text.toLowerCase()
      handleSubmit(isCorrect)
    } else if (e.key === ' ') {
      e.preventDefault() // 阻止空格键的默认行为
      // 空格键切换到下一个单词
      const currentInput = userInput[currentWordIndex] || ''

      // 检查输入长度（忽略标点符号）
      const cleanCurrentInput = cleanWord(currentInput)
      const cleanTargetWord = cleanWord(currentWord)

      if (cleanCurrentInput.length === cleanTargetWord.length) {
        // 输入完整，进行校验
        if (cleanCurrentInput === cleanTargetWord) {
          setWordStatus((prev: ('correct' | 'wrong' | 'pending')[]) => {
            const next = [...prev]
            next[currentWordIndex] = 'correct'
            return next
          })
          playCorrectSound() // 播放正确音效
          // 正确时跳转到下一个单词
          if (currentWordIndex < words.length - 1) {
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
      // 普通字符输入
      const newInput = [...userInput]
      newInput[currentWordIndex] = (newInput[currentWordIndex] || '') + e.key
      setUserInput(newInput)
      playTypingSound()
    }
  }

  // 提交答题
  const handleSubmit = async (isCorrect: boolean) => {
    if (!sentence) return
    await fetch('/api/sentence/record', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sentenceId: sentence.id,
        userInput: userInput.join(' '),
        correct: isCorrect,
        errorCount: currentSentenceErrorCount
      })
    })
    // 重置错误计数
    setCurrentSentenceErrorCount(0)
    // 更新进度
    await fetchProgress()
    // 获取下一个随机句子
    fetchNextSentence()
  }

  // 切换语料库
  function handleCorpusChange(id: number) {
    setCorpusId(id)
    setSentence(null)
    setUserInput([])
    setAudioUrl('')
    setIsCorpusCompleted(false)
  }

  // 返回语料库选择
  function handleBackToCorpusList() {
    setCorpusId(null)
    setCorpusOssDir('')
    setSentence(null)
    setUserInput([])
    setAudioUrl('')
    setIsCorpusCompleted(false)
  }

  // 获取翻译
  const handleTranslate = async () => {
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
  }

  // 切换句子，清除翻译显示
  useEffect(() => {
    setTranslation('')
    setShowTranslation(false)
  }, [sentence])

  return (
    <AuthGuard>
      <div className="max-w-5xl mx-auto p-4">
        {!corpusId ? (
          <div className="mb-4">
            <h2 className="text-2xl font-bold mb-4">选择语料库：</h2>
            <div className="flex flex-wrap gap-2">
              {corpora.map((c: { id: number, name: string, description?: string }) => (
                <div
                  key={c.id}
                  onClick={() => handleCorpusChange(c.id)}
                  className="w-[30%] p-5 bg-gray-200 rounded-lg cursor-pointer hover:bg-gray-300"
                >
                  <div className="text-center text-xl mb-3">{c.name}</div>
                  <div className="text-sm text-gray-500">{c.description}</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="mb-4 flex items-center gap-4">
            <span>当前语料库：<b>{corpusName}</b></span>
            <button onClick={handleBackToCorpusList} className="px-2 py-1 bg-gray-200 rounded-lg cursor-pointer hover:bg-gray-300">返回语料库选择</button>
          </div>
        )}
        {corpusId && (
          <div className='flex flex-col items-center h-[calc(100vh-300px)] justify-center'>
            {isCorpusCompleted ? (
              <div className="text-2xl font-bold text-green-600">
                恭喜！你已完成该语料库中的所有句子！
              </div>
            ) : loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                <span className="ml-2">加载中...</span>
              </div>
            ) : (
              <>
                {progress && (
                  <div className="text-gray-600 mb-4">
                    进度：{progress.completed}/{progress.total} ({Math.round((progress.completed / progress.total) * 100)}%)
                  </div>
                )}
                <div className="flex items-center gap-2 mb-4">
                  <button
                    onClick={() => {
                      if (!audioRef.current) return
                      if (audioRef.current.readyState === 0) {
                        audioRef.current.load()
                        return
                      }
                      audioRef.current.play().catch((err: Error) => {
                        console.error('播放按钮点击时发生错误:', err)
                      })
                    }}
                    className="p-2 hover:bg-gray-100 rounded-full"
                  >
                    <Volume2 className="w-6 h-6 cursor-pointer" />
                  </button>
                  <button
                    onClick={handleTranslate}
                    disabled={translating}
                    className="p-2 hover:bg-gray-100 rounded-full"
                  >
                    <Languages className={`w-6 h-6 cursor-pointer ${translating ? 'opacity-50' : ''} ${showTranslation ? 'text-blue-500' : ''}`} />
                  </button>
                  {audioUrl && (
                    <audio
                      ref={audioRef}
                      src={audioUrl}
                      preload="auto"
                    />
                  )}
                </div>
                <div className="flex flex-wrap gap-2 text-2xl mt-8 mb-4 relative">
                  {sentence?.text.split(' ').map((word: string, i: number) => {
                    // 计算输入框宽度，考虑标点符号的额外空间
                    const minWidth = 2 // 最小宽度为2个字符
                    const paddingWidth = 1 // 额外的padding宽度
                    const width = Math.max(minWidth, word.length + paddingWidth)

                    return (
                      <div key={i} className="relative">
                        <input
                          type="text"
                          value={userInput[i] || ''}
                          onChange={() => { }}
                          onKeyDown={handleInput}
                          className={`border-b-3 text-center font-medium text-3xl focus:outline-none ${wordStatus[i] === 'correct' ? 'border-green-500 text-green-500' :
                            wordStatus[i] === 'wrong' ? 'border-red-500 text-red-500' :
                              'border-gray-300'
                            }`}
                          style={{
                            width: `${width}ch`,
                            minWidth: `${width}ch`,
                            padding: '0 0.5ch'
                          }}
                          disabled={i !== currentWordIndex}
                          autoFocus={i === currentWordIndex}
                        />
                      </div>
                    )
                  })}
                  {showTranslation && translation && (
                    <div className="mt-4 text-gray-600 text-lg absolute bottom-[-40px] left-0 w-full text-center">
                      {translation}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </AuthGuard>
  )
}
