'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Volume2, Languages, BookA, Users, ChevronLeft, Hourglass, Clock } from 'lucide-react'
import Image from 'next/image'

import AuthGuard from '@/components/auth/AuthGuard'
import { Progress } from '@/components/ui/progress'
import { toast } from "sonner";
import Empty from '@/components/common/Empty';
import { formatLastStudiedTime } from '@/lib/timeUtils'

export default function SentencePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [corpora, setCorpora] = useState<{ id: number, slug: string, name: string, description?: string, ossDir: string }[]>([])
  const [corpusId, setCorpusId] = useState<number | null>(null)
  const [corpusSlug, setCorpusSlug] = useState<string>('')
  const [corpusOssDir, setCorpusOssDir] = useState<string>('')
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
  const [showSentence, setShowSentence] = useState(false)

  // 目录与句子集筛选相关
  interface CatalogFirst { id: number; name: string; slug: string; seconds: CatalogSecond[] }
  interface CatalogSecond { id: number; name: string; slug: string; thirds: CatalogThird[] }
  interface CatalogThird { id: number; name: string; slug: string }
  interface SentenceSetItem {
    id: number
    name: string
    slug: string
    description?: string
    isPro: boolean
    coverImage?: string
    ossDir: string
    _count: { sentences: number }
    learnersCount?: number
  }

  const [catalogs, setCatalogs] = useState<CatalogFirst[]>([])
  const [selectedFirstId, setSelectedFirstId] = useState<string>('ALL')
  const [selectedSecondId, setSelectedSecondId] = useState<string>('')
  const [selectedThirdId, setSelectedThirdId] = useState<string>('')
  const [sentenceSets, setSentenceSets] = useState<SentenceSetItem[]>([])
  const [selectedSentenceSetId, setSelectedSentenceSetId] = useState<string>('')
  const [sentenceGroups, setSentenceGroups] = useState<Array<{id:number; name:string; kind:string; order:number; total:number; done:number; lastStudiedAt: string | null}>>([])
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null)
  const [groupProgress, setGroupProgress] = useState<{done:number; total:number} | null>(null)

  // 获取语料库列表
  useEffect(() => {
    fetch('/api/sentence/corpus')
      .then(res => res.json())
      .then(data => {
        setCorpora(data)
      })
  }, [])

  // 加载目录树
  useEffect(() => {
    fetch('/api/catalog')
      .then(res => res.json())
      .then(data => {
        if (data.success) setCatalogs(data.data)
      })
      .catch(err => console.error('加载目录失败:', err))
  }, [])

  // 根据目录筛选加载句子集
  useEffect(() => {
    const params = new URLSearchParams()
    if (selectedFirstId && selectedFirstId !== 'ALL') params.set('catalogFirstId', selectedFirstId)
    if (selectedSecondId) params.set('catalogSecondId', selectedSecondId)
    if (selectedThirdId) params.set('catalogThirdId', selectedThirdId)

    fetch(`/api/sentence/sentence-set?${params.toString()}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) setSentenceSets(data.data)
      })
      .catch(err => console.error('加载句子集失败:', err))
  }, [selectedFirstId, selectedSecondId, selectedThirdId])

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
      }
      return;
    }

    if (idParam) {
      const idNum = parseInt(idParam);
      const found = corpora.find(c => c.id === idNum);
      if (found) {
        setCorpusId(idNum);
        setCorpusSlug(found.slug);
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
        setSentenceGroups(groups)
        const orderNum = parseInt(groupOrderParam)
        const match = groups.find((g: {id:number; order:number}) => g.order === orderNum)
        if (match) {
          setSelectedGroupId(match.id)
          setGroupProgress({ done: match.done, total: match.total })
        } else {
          setSelectedGroupId(null)
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
        const groups: Array<{id:number; order:number; total:number; done:number}> = data?.data || []
        const match = groups.find((g)=>g.id===selectedGroupId)
        if (match) setGroupProgress({ done: match.done, total: match.total })
      } else {
        const res = await fetch(`/api/sentence/stats?sentenceSet=${encodeURIComponent(corpusSlug)}`)
        const data = await res.json()
        setProgress(data)
      }
    } catch (error) {
      console.error('获取进度失败:', error)
    }
  }, [corpusSlug, selectedGroupId]);

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
    if (!corpusSlug) return
    setLoading(true)
    try {
      const params = new URLSearchParams({ sentenceSet: corpusSlug })
      if (selectedGroupId) params.set('groupId', String(selectedGroupId))
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
  }, [corpusSlug, checkVocabularyStatus, selectedGroupId]);

  // 当从 URL 初始化且有 set 参数但无 group 时，加载分组列表
  useEffect(() => {
    const groupParam = searchParams.get('group')
    if (!corpusSlug || groupParam) return

    // 检查是否已有分组数据，如果没有则加载
    if (sentenceGroups.length === 0) {
      fetch(`/api/sentence/group?sentenceSet=${encodeURIComponent(corpusSlug)}`)
        .then(res => res.json())
        .then(res => {
          const groups = Array.isArray(res.data) ? res.data : []
          setSentenceGroups(groups)
        })
        .catch(err => console.error('加载分组失败:', err))
    }
  }, [corpusSlug, searchParams, sentenceGroups.length])

  // 选择语料库后获取一个随机未完成的句子
  useEffect(() => {
    if (!corpusSlug) return
    const groupParam = searchParams.get('group')
    // 如果有 group 参数，说明已选择分组，需要获取句子
    // 如果没有 group 参数，说明在分组列表页，不需要获取句子
    if (!groupParam) return

    const corpus = corpora.find((c) => c.slug === corpusSlug)
    // setCorpusName(corpus?.name || '')
    setCorpusOssDir(corpus?.ossDir || '')
    fetchNextSentence()
    fetchProgress()
  }, [corpusSlug, corpora, fetchNextSentence, fetchProgress, searchParams])

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
    // 按空格键，显示答案
    if (e.key === ' ') {
      e.preventDefault() // 阻止空格键的默认行为
      // 显示句子
      setShowSentence(true)
    } else if (e.key === 'Enter') {
      e.preventDefault() // 阻止Enter键的默认行为
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
        isCorrect: isCorrect,
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
  function handleCorpusChange(slug: string, id?: number) {
    if (typeof id === 'number') setCorpusId(id)
    setCorpusSlug(slug)
    setSentence(null)
    setUserInput([])
    setAudioUrl('')
    setIsCorpusCompleted(false)

    // 更新URL参数
    const params = new URLSearchParams(searchParams.toString());
    params.set('sentenceSet', slug);
    // 兼容旧参数，移除 id
    params.delete('id')
    router.push(`/sentence?${params.toString()}`);
  }

  // 返回语料库选择
  function handleBackToCorpusList() {
    setCorpusId(null)
    setCorpusSlug('')
    setCorpusOssDir('')
    setSentence(null)
    setUserInput([])
    setAudioUrl('')
    setIsCorpusCompleted(false)
    setSelectedSentenceSetId('')

    // 清除URL参数
    router.push('/sentence');
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

  // 当选择句子集时，切换到该句子集
  useEffect(() => {
    if (!selectedSentenceSetId) return
    const selected = sentenceSets.find(s => s.id === parseInt(selectedSentenceSetId))
    if (!selected) return
    fetch(`/api/sentence/group?setId=${selected.id}`)
      .then(res => res.json())
      .then(res => {
        const groups = Array.isArray(res.data) ? res.data : []
        if (groups.length > 0) {
          setSentenceGroups(groups)
          // 替换原弹窗：不再弹窗，直接通过 URL 进入分组页
          const params = new URLSearchParams(searchParams.toString())
          params.set('set', selected.slug)
          // 不附加 group，进入分组列表页
          router.push(`/sentence?${params.toString()}`)
        } else {
          setSelectedGroupId(null)
          handleCorpusChange(selected.slug, selected.id)
          setCorpusOssDir(selected.ossDir)
        }
      })
      .catch(() => {
        setSelectedGroupId(null)
        handleCorpusChange(selected.slug, selected.id)
        setCorpusOssDir(selected.ossDir)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSentenceSetId])

  return (
    <AuthGuard>
      {/* 进度条区域 */}
      {corpusId && ((selectedGroupId && groupProgress) || (!selectedGroupId && progress)) && (
        <div className="container mx-auto mt-6 px-4">
          <Progress value={selectedGroupId && groupProgress ? (groupProgress.done / (groupProgress.total || 1)) * 100 : (progress!.completed / (progress!.total || 1)) * 100} className="w-full h-3" />
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600">进度</span>
            <span className="text-sm text-gray-600">
              {selectedGroupId && groupProgress ? `${groupProgress.done} / ${groupProgress.total}` : `${progress!.completed} / ${progress!.total}`}
            </span>
          </div>
        </div>
      )}

      <div className="container mx-auto p-4">
        {!corpusId ? (
          <div className="mb-4">
            {/* 顶部级联筛选导航 */}
            <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
              <div className="container mx-auto px-4 py-3">
                {/* 一级目录 */}
                <div className="flex gap-2 mb-2 overflow-x-auto">
                  <button
                    onClick={() => { setSelectedFirstId('ALL'); setSelectedSecondId(''); setSelectedThirdId('') }}
                    className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                      selectedFirstId === 'ALL'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                    }`}
                  >
                    全部
                  </button>
                  {catalogs.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => { setSelectedFirstId(String(cat.id)); setSelectedSecondId(''); setSelectedThirdId('') }}
                      className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                        selectedFirstId === String(cat.id)
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>

                {/* 二级目录 */}
                {selectedFirstId && (catalogs.find(c => c.id === parseInt(selectedFirstId))?.seconds?.length || 0) > 0 && (
                  <div className="flex gap-2 mb-2 overflow-x-auto">
                    <button
                      onClick={() => { setSelectedSecondId(''); setSelectedThirdId('') }}
                      className={`px-3 py-1.5 text-sm rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                        !selectedSecondId ? 'bg-blue-400 text-white' : 'bg-gray-50 hover:bg-gray-100 text-gray-600'
                      }`}
                    >
                      全部
                    </button>
                    {(catalogs.find(c => c.id === parseInt(selectedFirstId))?.seconds || []).map(sec => (
                      <button
                        key={sec.id}
                        onClick={() => { setSelectedSecondId(String(sec.id)); setSelectedThirdId('') }}
                        className={`px-3 py-1.5 text-sm rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                          selectedSecondId === String(sec.id) ? 'bg-blue-400 text-white' : 'bg-gray-50 hover:bg-gray-100 text-gray-600'
                        }`}
                      >
                        {sec.name}
                      </button>
                    ))}
                  </div>
                )}

                {/* 三级目录 */}
                {selectedSecondId && ((catalogs.find(c => c.id === parseInt(selectedFirstId))?.seconds || []).find(s => s.id === parseInt(selectedSecondId))?.thirds?.length || 0) > 0 && (
                  <div className="flex gap-2 overflow-x-auto">
                    <button
                      onClick={() => setSelectedThirdId('')}
                      className={`px-3 py-1.5 text-sm rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                        !selectedThirdId ? 'bg-blue-300 text-white' : 'bg-gray-50 hover:bg-gray-100 text-gray-600'
                      }`}
                    >
                      全部
                    </button>
                    {(((catalogs.find(c => c.id === parseInt(selectedFirstId))?.seconds) || []).find(s => s.id === parseInt(selectedSecondId))?.thirds || []).map(th => (
                      <button
                        key={th.id}
                        onClick={() => setSelectedThirdId(String(th.id))}
                        className={`px-3 py-1.5 text-sm rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                          selectedThirdId === String(th.id) ? 'bg-blue-300 text-white' : 'bg-gray-50 hover:bg-gray-100 text-gray-600'
                        }`}
                      >
                        {th.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 句子课程包列表 */}
            {sentenceSets.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 mt-4">
                {sentenceSets.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => router.push(`/sentence?set=${s.slug}`)}
                    className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-gray-200 dark:border-gray-700"
                  >
                    <div className="relative h-[240px] bg-gradient-to-br from-blue-400 to-purple-500">
                      {s.coverImage ? (
                        <Image width={180} height={100} src={(s.coverImage || '').trim()} alt={s.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white text-2xl font-bold px-6">
                          {s.name}
                        </div>
                      )}
                      {s.isPro && (
                        <span className="absolute top-2 right-2 bg-black text-white text-xs px-2 py-1 rounded">会员专享</span>
                      )}
                    </div>
                    <div className="px-2 py-1 w-full bg-white opacity-75 dark:bg-gray-800">
                      <h3 className="font-bold text-sm line-clamp-1 mb-1">{s.name}</h3>
                      <div className='flex justify-between items-center'>
                        <p className="text-sm text-gray-500">{s._count.sentences} 句</p>
                        <div className="text-sm flex items-center text-gray-500">
                          <Users className='w-4 h-4' />
                          <p className='ml-1'>{s.learnersCount ?? 0}人</p>
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
        ) : (
          <div className="mb-4 flex items-center gap-4">
            {/* <span>当前语料库：<b>{corpusName}</b></span> */}
            <button onClick={handleBackToCorpusList} className="px-2 py-2 bg-gray-200 rounded-lg cursor-pointer hover:bg-gray-300 flex items-center justify-center">
              <ChevronLeft className='w-4 h-4' />
              返回
            </button>
          </div>
        )}
        {/* 分组整页列表（当 URL 有 set 但无 group） */}
        {corpusSlug && !searchParams.get('group') && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {sentenceGroups.map(g => (
              <button key={g.id}
                onClick={() => {
                  const params = new URLSearchParams(searchParams.toString())
                  params.set('set', corpusSlug)
                  params.set('group', String(g.order))
                  router.push(`/sentence?${params.toString()}`)
                }}
                className="text-left p-4 border rounded hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                <div className="text-2xl font-semibold">{g.name}</div>
                <div className="text-base text-gray-500 mt-1">第{g.order}组</div>
                <div className='flex gap-4'>
                  <div className="text-base text-gray-500 mt-1 flex items-center">
                    <Hourglass className='w-4 h-4' />
                    <span className='ml-1'>{g.done}/{g.total}</span>
                  </div>
                  <div className="text-base text-gray-500 mt-1 flex items-center">
                    <Clock className='w-4 h-4' />
                    <span className='ml-1'>{formatLastStudiedTime(g.lastStudiedAt)}</span>
                  </div>
                  {g.done >= g.total && (
                    <div className="text-xs border bg-green-500 text-white rounded-full px-3 py-1 flex items-center justify-center">
                      已完成
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
        {corpusId && selectedGroupId && (
          <div className='flex flex-col items-center h-[calc(100vh-300px)] justify-center relative'>
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
                <div className='absolute top-12 left-0 w-full flex justify-center items-center'>
                  {showSentence && (
                    <div className="text-3xl font-base mb-8">
                      {sentence?.text}
                    </div>
                  )}
                </div>
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
              </>
            )}
          </div>
        )}
      </div>
    </AuthGuard>
  )
}
