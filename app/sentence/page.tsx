'use client'

import { useEffect, useState, useRef,useCallback } from 'react'
import { Volume2, Languages, BookA } from 'lucide-react'

import AuthGuard from '@/components/auth/AuthGuard'
import { Progress } from '@/components/ui/progress'
import { toast } from "sonner";

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
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isAddingToVocabulary, setIsAddingToVocabulary] = useState(false)
  const [isInVocabulary, setIsInVocabulary] = useState(false)
  const [checkingVocabulary, setCheckingVocabulary] = useState(false)
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
  const fetchProgress = useCallback(async () => {
    if (!corpusId) return
    try {
      const res = await fetch(`/api/sentence/stats?corpusId=${corpusId}`)
      const data = await res.json()
      setProgress(data)
    } catch (error) {
      console.error('获取进度失败:', error)
    }
  }, [corpusId]);

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

      setSentence(data)
      setUserInput(Array(data.text.split(' ').length).fill(''))
      setWordStatus(Array(data.text.split(' ').length).fill('pending'))
      setCurrentWordIndex(0)
      setCurrentSentenceErrorCount(0)

      // 检查当前句子是否在生词本中
      if (data.id) {
        checkVocabularyStatus(data.id);
      }

      setLoading(false)
    } catch (error) {
      console.error('获取句子失败:', error)
      setLoading(false)
    }
  }, [corpusId, checkVocabularyStatus]);

  // 选择语料库后获取一个随机未完成的句子
  useEffect(() => {
    if (!corpusId) return
    const corpus = corpora.find((c: { id: number }) => c.id === corpusId)
    setCorpusName(corpus?.name || '')
    setCorpusOssDir(corpus?.ossDir || '')
    fetchNextSentence()
    fetchProgress()
  }, [corpusId,corpora,fetchNextSentence,fetchProgress])

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

  // 监听audioUrl变化，设置音频元素和自动播放
  useEffect(() => {
    if (!audioUrl || !audioRef.current) return

    const audio = audioRef.current

    // 设置音频源
    audio.src = audioUrl
    audio.load()

    // 设置播放状态监听器
    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    const handleEnded = () => setIsPlaying(false)

    audio.addEventListener('play', handlePlay)
    audio.addEventListener('pause', handlePause)
    audio.addEventListener('ended', handleEnded)

    // 自动播放
    const handleCanPlayThrough = () => {
      audio.play().catch(err => {
        console.error('自动播放失败:', err)
        setIsPlaying(false)
      })
    }

    audio.addEventListener('canplaythrough', handleCanPlayThrough)

    // 清理函数
    return () => {
      audio.removeEventListener('play', handlePlay)
      audio.removeEventListener('pause', handlePause)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('canplaythrough', handleCanPlayThrough)
    }
  }, [audioUrl])

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
    await fetch('/api/sentence/create-record', {
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

  // 切换句子，清除翻译显示和重置生词本状态
  useEffect(() => {
    setTranslation('')
    setShowTranslation(false)
    setIsInVocabulary(false)
    setCheckingVocabulary(false)
  }, [sentence])

  // 添加到生词本
  const handleAddToVocabulary = async () => {
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
  };

  return (
    <AuthGuard>
      {/* 进度条区域 */}
      {corpusId && progress && (
        <div className="container mx-auto mt-6 px-4">
          <Progress value={(progress.completed / progress.total) * 100} className="w-full h-3" />
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600">学习进度</span>
            <span className="text-sm text-gray-600">
              {progress.completed} / {progress.total}
            </span>
          </div>
        </div>
      )}

      <div className="container mx-auto p-4">
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
                <div className="flex items-center gap-2 mb-4">
                  <button
                    onClick={() => {
                      if (!audioRef.current) return

                      const audio = audioRef.current

                      // 设置播放速度
                      audio.playbackRate = playbackSpeed

                      // 播放音频
                      audio.play().catch(err => {
                        console.error('播放失败:', err)
                        setIsPlaying(false)
                      })
                    }}
                    className="p-2 hover:bg-gray-100 rounded-full"
                  >
                    <Volume2 className={`w-6 h-6 cursor-pointer ${isPlaying ? 'text-blue-500' : ''}`} />
                  </button>
                  <select
                    value={playbackSpeed}
                    onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                    className="px-2 py-1 border rounded text-sm"
                  >
                    <option value="0.75">0.75x</option>
                    <option value="1">1.0x</option>
                    <option value="1.25">1.25x</option>
                    <option value="1.5">1.5x</option>
                  </select>
                  <button
                    onClick={handleTranslate}
                    disabled={translating}
                    className="p-2 hover:bg-gray-100 rounded-full"
                  >
                    <Languages className={`w-6 h-6 cursor-pointer ${translating ? 'opacity-50' : ''} ${showTranslation ? 'text-blue-500' : ''}`} />
                  </button>
                  <button
                    onClick={handleAddToVocabulary}
                    disabled={isAddingToVocabulary || checkingVocabulary || isInVocabulary}
                    className={`p-2 rounded-full transition-colors ${
                      isInVocabulary
                        ? 'bg-green-100 cursor-default'
                        : 'hover:bg-gray-100'
                    }`}
                    title={
                      checkingVocabulary
                        ? '检查中...'
                        : isAddingToVocabulary
                          ? '添加中...'
                          : isInVocabulary
                            ? '已在生词本'
                            : '加入生词本'
                    }
                  >
                    <BookA className={`w-6 h-6 ${
                      checkingVocabulary || isAddingToVocabulary ? 'opacity-50' : ''
                    } ${
                      isInVocabulary ? 'text-green-600' : 'cursor-pointer'
                    }`} />
                  </button>
                  <audio
                    ref={audioRef}
                    preload="auto"
                    style={{ display: 'none' }}
                  />
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
                          onChange={()=>{}}
                          onKeyDown={handleInput}
                          className={`border-b-3 text-center font-medium text-3xl focus:outline-none ${wordStatus[i] === 'correct' ? 'border-green-500 text-green-500' :
                            wordStatus[i] === 'wrong' ? 'border-red-500 text-red-500' :
                              'border-gray-300'
                            }`}
                          style={{
                            width: `${width * 0.8}em`,
                            minWidth: `${width * 0.7}em`,
                            padding: '0 0.5em'
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
                {/* 添加按键说明区域 */}
                <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-100 rounded-lg p-4 shadow-md w-[90%] max-w-md">
                  <div className="text-center text-gray-600 flex flex-col sm:flex-row items-center gap-4">
                    <div className="w-full sm:w-auto">
                      <kbd className="inline-block px-10 py-1 bg-white border-2 border-gray-300 rounded-md shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] active:shadow-[0px_0px_0px_0px_rgba(0,0,0,0.1)] active:translate-y-[2px] active:translate-x-[2px] transition-all">
                        <div className="text-sm -mb-1">空格</div>
                      </kbd>
                      <span className="ml-2 text-sm text-gray-500">校验单词是否正确</span>
                    </div>
                    <div className="w-full sm:w-auto">
                      <kbd className="inline-block px-2 py-1 bg-white border-2 border-gray-300 rounded-md shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] active:shadow-[0px_0px_0px_0px_rgba(0,0,0,0.1)] active:translate-y-[2px] active:translate-x-[2px] transition-all">
                        <div className="flex items-center">
                          <svg className="w-4 h-4 ml-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M20 4V10C20 11.0609 19.5786 12.0783 18.8284 12.8284C18.0783 13.5786 17.0609 14 16 14H4M4 14L8 10M4 14L8 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                      </kbd>
                      <span className="ml-2 text-sm text-gray-500">提交并跳转下一句</span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </AuthGuard>
  )
}
