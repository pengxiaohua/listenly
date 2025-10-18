'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Volume2, BookA, SkipForward } from 'lucide-react';
import AuthGuard from '@/components/auth/AuthGuard'
import Image from 'next/image';

import { wordsTagsChineseMap, WordTags } from '@/constants'
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';

import { toast } from "sonner";
import Empty from '@/components/common/Empty';

interface Word {
  id: string;
  word: string;
  translation: string;
  phoneticUS: string;
  phoneticUK: string;
  definition: string;
  category: string;
}

interface CatalogFirst {
  id: number
  name: string
  slug: string
  seconds: CatalogSecond[]
}

interface CatalogSecond {
  id: number
  name: string
  slug: string
  thirds: CatalogThird[]
}

interface CatalogThird {
  id: number
  name: string
  slug: string
}

interface WordSet {
  id: number
  name: string
  slug: string
  description?: string
  isPro: boolean
  coverImage?: string
  _count: { words: number }
}

export default function WordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [currentTag, setCurrentTag] = useState<WordTags | ''>('');

  // 新增: 目录筛选相关状态
  const [catalogs, setCatalogs] = useState<CatalogFirst[]>([])
  const [selectedFirstId, setSelectedFirstId] = useState<string>('ALL') // 默认选中"全部"
  const [selectedSecondId, setSelectedSecondId] = useState<string>('')
  const [selectedThirdId, setSelectedThirdId] = useState<string>('')
  const [wordSets, setWordSets] = useState<WordSet[]>([])
  const [selectedWordSetId, setSelectedWordSetId] = useState<string>('')
  const [currentWordSet, setCurrentWordSet] = useState<WordSet | null>(null)

  const [currentWords, setCurrentWords] = useState<Word[]>([]);
  const [currentWord, setCurrentWord] = useState<Word | null>(null);
  const [audioUrl, setAudioUrl] = useState('')
  const [inputLetters, setInputLetters] = useState<string[]>([]);
  const [errorIndexes, setErrorIndexes] = useState<number[]>([]);
  const [correctCount, setCorrectCount] = useState(0);
  const [showPhonetic, setShowPhonetic] = useState(false);
  const [totalWords, setTotalWords] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [currentOffset, setCurrentOffset] = useState(0);
  const [hasMoreWords, setHasMoreWords] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isAddingToVocabulary, setIsAddingToVocabulary] = useState(false);
  const [isInVocabulary, setIsInVocabulary] = useState(false);
  const [checkingVocabulary, setCheckingVocabulary] = useState(false);
  const [isCorpusCompleted, setIsCorpusCompleted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const initializedTagRef = useRef<string | null>(null);

  useEffect(() => {
    // 在组件挂载后初始化
    synthRef.current = window.speechSynthesis;
  }, []);

  // 获取统计信息的函数
  const loadCategoryStats = useCallback(async (category: string) => {
    try {
      const response = await fetch(`/api/word/stats?category=${category}`);
      const data = await response.json();

      if (data.success) {
        setCorrectCount(data.data.completed);
        setTotalWords(data.data.total);
      }
    } catch (error) {
      console.error("获取统计信息失败:", error);
    }
  }, []);

  // 加载单词的函数，支持分页
  const loadWords = useCallback(async (category: string, offset: number = 0, limit: number = 20) => {
    try {
      const response = await fetch(`/api/word/unfinished?category=${category}&limit=${limit}&offset=${offset}`);
      const data = await response.json();

      if (data.words) {
        return {
          words: data.words,
          total: data.total,
          hasMore: data.hasMore
        };
      }
      return { words: [], total: 0, hasMore: false };
    } catch (error) {
      console.error("加载单词失败:", error);
      return { words: [], total: 0, hasMore: false };
    }
  }, []);

  // 加载更多单词
  const loadMoreWords = useCallback(async () => {
    if (!currentTag || isLoadingMore || !hasMoreWords) return;

    setIsLoadingMore(true);
    try {
      const { words: newWords, hasMore } = await loadWords(currentTag as string, currentOffset + 20);
      setCurrentWords(prev => [...prev, ...newWords]);
      setCurrentOffset(prev => prev + 20);
      setHasMoreWords(hasMore);
    } catch (error) {
      console.error("加载更多单词失败:", error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [currentTag, currentOffset, hasMoreWords, isLoadingMore, loadWords]);

  const speakWord = useCallback((text: string, lang: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    // 在Chrome语音合成器中，语音合成需要用户在说话之前进行交互
    synthRef.current?.cancel();
    utterance.lang = lang;
    utterance.rate = 1;
    synthRef.current?.speak(utterance);
  }, []);

  // 检查当前单词是否在生词本中
  const checkVocabularyStatus = useCallback(async (wordId: string) => {
    setCheckingVocabulary(true);
    try {
      const response = await fetch(`/api/vocabulary/check?type=word&wordId=${wordId}`);
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

  // 获取下一个单词
  const fetchNextWord = useCallback(async () => {
    if (currentTag === '') return
    setIsLoading(true)
    try {
      // 选择候选词列表：若本地为空则加载并立即使用加载结果
      let candidateWords = currentWords

      if (candidateWords.length === 0) {
        const { words, hasMore } = await loadWords(currentTag as string, currentOffset, 20)
        if (words.length === 0) {
          setIsCorpusCompleted(true)
          return
        }
        setCurrentWords(words)
        setCurrentOffset(prev => prev + 20)
        setHasMoreWords(hasMore)
        candidateWords = words
      }

      if (candidateWords.length > 0) {
        const randomIndex = Math.floor(Math.random() * candidateWords.length)
        const word = candidateWords[randomIndex]
        setCurrentWord(word)
        setInputLetters(Array(word.word.length).fill(''))
        setErrorIndexes([])

        setTimeout(() => document.getElementById('letter-0')?.focus(), 100)

        if (word.id) {
          checkVocabularyStatus(word.id)
        }

        if (candidateWords.length <= 5 && hasMoreWords && !isLoadingMore) {
          loadMoreWords()
        }
      }
    } catch (error) {
      console.error('获取单词失败:', error)
    } finally {
      setIsLoading(false)
    }
  }, [currentTag, currentWords, currentOffset, hasMoreWords, isLoadingMore, loadWords, loadMoreWords, checkVocabularyStatus])

  // 加载目录树
  useEffect(() => {
    fetch('/api/catalog?type=WORD')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setCatalogs(data.data)
        }
      })
      .catch(err => console.error('加载目录失败:', err))
  }, [])

  // 根据目录筛选加载单词集
  useEffect(() => {
    const params = new URLSearchParams()

    // 如果选择了"全部",则不传 catalogFirstId,获取所有单词集
    if (selectedFirstId && selectedFirstId !== 'ALL') {
      params.set('catalogFirstId', selectedFirstId)
    }
    if (selectedSecondId) params.set('catalogSecondId', selectedSecondId)
    if (selectedThirdId) params.set('catalogThirdId', selectedThirdId)

    fetch(`/api/word/word-set?${params.toString()}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setWordSets(data.data)
        }
      })
      .catch(err => console.error('加载单词集失败:', err))
  }, [selectedFirstId, selectedSecondId, selectedThirdId])


  // 从URL参数初始化分类
  useEffect(() => {
    const nameParam = searchParams.get('name');
    if (nameParam && wordsTagsChineseMap[nameParam as WordTags]) {
      setCurrentTag(nameParam as WordTags);
    }
  }, [searchParams]);

  // 从URL参数初始化课程包或直接切换到对应 slug（支持 id 为数字ID或为分类slug）
  useEffect(() => {
    const idParam = searchParams.get('id');
    if (!idParam) return;

    // 数字：当作词集 ID 处理
    if (/^\d+$/.test(idParam)) {
      setSelectedWordSetId(idParam);
      return;
    }

    // 非数字：当作 slug，直接切换到该分类，并移除 id 避免循环
    initializedTagRef.current = null
    setCurrentTag(idParam as WordTags)
    setCurrentWord(null)
    setCurrentWords([])
    setCurrentOffset(0)
    setHasMoreWords(true)
    setIsCorpusCompleted(false)

    const params = new URLSearchParams(searchParams.toString());
    params.set('name', idParam);
    params.delete('id');
    router.push(`/word?${params.toString()}`);
  }, [searchParams, router]);

  // 选择词库分类后获取一个随机未完成的单词
  useEffect(() => {
    if (!currentTag) return
    loadCategoryStats(currentTag)
    if (initializedTagRef.current !== currentTag) {
      initializedTagRef.current = currentTag
      fetchNextWord()
    }
  }, [currentTag, loadCategoryStats, fetchNextWord])

  useEffect(() => {
    if (!currentWord || !currentTag) return

    fetch(`/api/word/mp3-url?word=${encodeURIComponent(currentWord.word)}&dir=words/${currentTag}`)
      .then(res => res.json())
      .then(mp3 => {
        setAudioUrl(mp3?.url || '')
      })
      .catch(error => {
        console.error('获取MP3失败:', error)
      })
  }, [currentWord, currentTag])

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

  // 记录单词拼写结果
  const recordWordResult = async (wordId: string, isCorrect: boolean, errorCount: number): Promise<boolean> => {
    try {
      const response = await fetch('/api/word/create-record', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wordId,
          isCorrect,
          errorCount
        })
      });

      const data = await response.json();
      if (!data.success) {
        console.error('记录失败:', data.error);
        return false;
      }
      return true;
    } catch (error) {
      console.error('记录拼写结果失败:', error);
      return false;
    }
  };

  // 播放音效
  const playSound = (src: string) => {
    const audio = new Audio(src);
    audio.play();
  };

  const handleInput = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    if (!currentWord) return;
    const value = e.target.value.slice(-1);
    const newInputLetters = [...inputLetters];
    newInputLetters[index] = value;

    if (value.toLowerCase() !== currentWord.word[index].toLowerCase()) {
      setErrorIndexes(prev => [...prev, index]);
      playSound('/sounds/wrong.mp3');

      // 记录错误拼写
      if (currentWord.id) {
        await recordWordResult(currentWord.id, false, 1);
      }
    } else {
      // 输入正确字母时播放打字音效
      playSound('/sounds/typing.mp3');
      setErrorIndexes(prev => prev.filter(i => i !== index));
      const nextInput = document.getElementById(`letter-${index + 1}`);
      if (nextInput) nextInput.focus();
    }

    setInputLetters(newInputLetters);

    if (newInputLetters.join('').toLowerCase().trim() === currentWord.word.toLowerCase().trim()) {
      setCorrectCount(prev => prev + 1);
      playSound('/sounds/correct.mp3');

      // 记录正确拼写结果
      if (currentWord.id) {
        const ok = await recordWordResult(currentWord.id, true, 0);
        if (ok && currentTag) {
          // 同步后端统计，避免前后端不一致
          loadCategoryStats(currentTag);
        }
      }

      // 从当前单词列表中移除已完成的单词
      const updatedWords = currentWords.filter(w => w.id !== currentWord.id);
      setCurrentWords(updatedWords);

      setTimeout(() => {
        if (updatedWords.length > 0) {
          // 从剩余单词中随机选择一个
          const randomIndex = Math.floor(Math.random() * updatedWords.length)
          const nextWord = updatedWords[randomIndex]
          setCurrentWord(nextWord)
          setInputLetters(Array(nextWord.word.length).fill(''))
          setErrorIndexes([])

          setTimeout(() => document.getElementById('letter-0')?.focus(), 100)
          // speakWord(nextWord.word, 'en-US')

          // 检查下一个单词是否在生词本中
          if (nextWord.id) {
            checkVocabularyStatus(nextWord.id)
          }
        } else {
          // 如果没有更多未完成的单词，显示完成信息
          setCurrentWord(null);
        }
      }, 500);
    }
  };

  // 切换词库分类
  function handleTagChange(tag: WordTags) {
    initializedTagRef.current = null
    setCurrentTag(tag)
    setCurrentWord(null)
    setCurrentWords([])
    setCurrentOffset(0)
    setHasMoreWords(true)
    setIsCorpusCompleted(false)

    // 更新URL参数
    const params = new URLSearchParams(searchParams.toString());
    params.set('name', tag);
    router.push(`/word?${params.toString()}`);
  }

  // 返回词库分类选择
  function handleBackToTagList() {
    initializedTagRef.current = null
    setCurrentTag('')
    setCurrentWord(null)
    setCurrentWords([])
    setCurrentOffset(0)
    setHasMoreWords(true)
    setIsCorpusCompleted(false)

    // 清除URL参数
    router.push('/word');
  }

  // 跳过单词时也记录结果
  const handleSkipWord = () => {
    if (!currentWord?.id) return;

    // 记录跳过的单词为未完成
    recordWordResult(currentWord.id, false, 0);

    // 从当前单词列表中移除已跳过的单词
    const updatedWords = currentWords.filter(w => w.id !== currentWord.id);
    setCurrentWords(updatedWords);

    if (updatedWords.length > 0) {
      // 从剩余单词中随机选择一个
      const randomIndex = Math.floor(Math.random() * updatedWords.length)
      const nextWord = updatedWords[randomIndex]
      setCurrentWord(nextWord)
      setInputLetters(Array(nextWord.word.length).fill(''))
      setErrorIndexes([])

      setTimeout(() => document.getElementById('letter-0')?.focus(), 100)
      // speakWord(nextWord.word, 'en-US')

      // 检查下一个单词是否在生词本中
      if (nextWord.id) {
        checkVocabularyStatus(nextWord.id)
      }
    } else {
      setCurrentWord(null);  // 显示完成信息
    }
  };

  // 添加到生词本
  const handleAddToVocabulary = async () => {
    if (!currentWord?.id) return;

    setIsAddingToVocabulary(true);
    try {
      const response = await fetch('/api/vocabulary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'word',
          wordId: currentWord.id,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success('已添加到生词本！');
        setIsInVocabulary(true); // 更新状态
      } else if (response.status === 409) {
        toast.error('该单词已在生词本中');
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

  // 当选择单词集时,切换到该单词集
  useEffect(() => {
    if (selectedWordSetId) {
      const selectedSet = wordSets.find(ws => ws.id === parseInt(selectedWordSetId))
      if (selectedSet) {
        setCurrentWordSet(selectedSet)
        // 使用单词集的 slug 作为 category
        handleTagChange(selectedSet.slug as WordTags)
      }
    }
  }, [selectedWordSetId, wordSets]) // eslint-disable-line react-hooks/exhaustive-deps

  // 获取可选的二级目录
  const availableSeconds = selectedFirstId && selectedFirstId !== 'ALL'
    ? catalogs.find(c => c.id === parseInt(selectedFirstId))?.seconds || []
    : []

  // 获取可选的三级目录
  const availableThirds = selectedSecondId && selectedSecondId !== 'NONE'
    ? availableSeconds.find(s => s.id === parseInt(selectedSecondId))?.thirds || []
    : []

  return (
    <AuthGuard>
      {/* 顶部级联筛选导航 */}
      {!currentTag && (
        <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
          <div className="container mx-auto px-4 py-3">
            {/* 一级目录 */}
            <div className="flex gap-2 mb-2 overflow-x-auto">
              <button
                onClick={() => {
                  setSelectedFirstId('ALL')
                  setSelectedSecondId('')
                  setSelectedThirdId('')
                }}
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
                  onClick={() => {
                    setSelectedFirstId(String(cat.id))
                    setSelectedSecondId('')
                    setSelectedThirdId('')
                  }}
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
            {selectedFirstId && availableSeconds.length > 0 && (
              <div className="flex gap-2 mb-2 overflow-x-auto">
                <button
                  onClick={() => {
                    setSelectedSecondId('')
                    setSelectedThirdId('')
                  }}
                  className={`px-3 py-1.5 text-sm rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                    !selectedSecondId
                      ? 'bg-blue-400 text-white'
                      : 'bg-gray-50 hover:bg-gray-100 text-gray-600'
                  }`}
                >
                  全部
                </button>
                {availableSeconds.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setSelectedSecondId(String(cat.id))
                      setSelectedThirdId('')
                    }}
                    className={`px-3 py-1.5 text-sm rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                      selectedSecondId === String(cat.id)
                        ? 'bg-blue-400 text-white'
                        : 'bg-gray-50 hover:bg-gray-100 text-gray-600'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            )}

            {/* 三级目录 */}
            {selectedSecondId && availableThirds.length > 0 && (
              <div className="flex gap-2 overflow-x-auto">
                <button
                  onClick={() => setSelectedThirdId('')}
                  className={`px-3 py-1.5 text-sm rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                    !selectedThirdId
                      ? 'bg-blue-300 text-white'
                      : 'bg-gray-50 hover:bg-gray-100 text-gray-600'
                  }`}
                >
                  全部
                </button>
                {availableThirds.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedThirdId(String(cat.id))}
                    className={`px-3 py-1.5 text-sm rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                      selectedThirdId === String(cat.id)
                        ? 'bg-blue-300 text-white'
                        : 'bg-gray-50 hover:bg-gray-100 text-gray-600'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 进度条区域 */}
      {currentTag && (
        <div className="container mx-auto mt-6 px-4">
          <Progress value={(correctCount / totalWords) * 100} className="w-full h-3" />
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600">学习进度</span>
            <span className="text-sm text-gray-600">
              {correctCount} / {totalWords}
              {isLoadingMore && (
                <span className="text-xs text-gray-500 ml-2">
                  正在加载更多单词...
                </span>
              )}
            </span>
          </div>
        </div>
      )}

      <div className="container mx-auto p-4">
        {!currentTag ? (
          <div className="mb-4">
            {/* 单词课程包列表 */}
            {wordSets.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {wordSets.map((ws) => (
                  <div
                    key={ws.id}
                    onClick={() => setSelectedWordSetId(String(ws.id))}
                    className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-gray-200 dark:border-gray-700"
                  >
                    {/* 课程封面 */}
                    <div className="relative h-[240px] bg-gradient-to-br from-blue-400 to-purple-500">
                      {ws.coverImage ? (
                        <Image
                          width={180}
                          height={100}
                          src={(ws.coverImage || '').trim()}
                          alt={ws.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white text-2xl font-bold px-6">
                          {ws.name}
                        </div>
                      )}
                      {ws.isPro && (
                        <span className="absolute top-2 right-2 bg-black text-white text-xs px-2 py-1 rounded">
                          会员专享
                        </span>
                      )}
                    </div>
                    {/* 课程信息 */}
                    <div className="px-2 py-1 w-full bg-white opacity-75 dark:bg-gray-800">
                      <h3 className="font-bold text-sm mb-1 line-clamp-1">{ws.name}</h3>
                      <p className="text-xs text-gray-500">
                        {ws._count.words} 单词
                      </p>
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
            <span>当前课程：<b>{currentWordSet?.name || wordsTagsChineseMap[currentTag as WordTags] || currentTag}</b></span>
            <button onClick={handleBackToTagList} className="px-4 py-2 bg-gray-200 dark:bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors">
              ← 返回课程列表
            </button>
          </div>
        )}
        {currentTag && (
          <div className='flex flex-col items-center h-[calc(100vh-300px)] justify-center'>
            {isCorpusCompleted ? (
              <div className="text-2xl font-bold text-green-600">
                恭喜！你已完成该词库中的所有单词！
              </div>
            ) : isLoading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                <span className="ml-2">加载中...</span>
              </div>
            ) : !currentWord ? (
              <div className="text-2xl font-bold text-green-600">
                恭喜！你已完成当前词库的所有单词！
              </div>
            ) : (
              <>
                <div className="flex justify-center items-center gap-3 mt-8 text-gray-400">
                <button
                    onClick={() => {
                      // 如果没有OSS发音，则使用语音合成
                      if (!audioRef?.current || !audioUrl) {
                        speakWord(currentWord.word, 'en-US')
                        return
                      }

                      const audio = audioRef.current

                      // 设置播放速度
                      audio.playbackRate = 1;

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
                  {/* <div className="flex items-center cursor-pointer" onClick={() => currentWord && speakWord(currentWord.word, 'en-GB')}>
                    UK&nbsp;<Volume2 />
                  </div>
                  {
                    !!currentWord?.phoneticUK && showPhonetic &&
                    <div className='bg-gray-400 text-white rounded-md px-[6px] py-[2px]'>/{currentWord?.phoneticUK}/</div>
                  }
                  <div className="flex items-center cursor-pointer" onClick={() => currentWord && speakWord(currentWord.word, 'en-US')}>
                    US&nbsp;<Volume2 />
                  </div>
                   */}
                  {
                    !!currentWord?.phoneticUS && showPhonetic &&
                    <div className='bg-gray-400 text-white rounded-md px-[6px] py-[2px]'>/{currentWord?.phoneticUS}/</div>
                  }
                </div>

                <div className="flex justify-center mt-4 text-gray-600 whitespace-pre-line">
                  {currentWord && currentWord.translation.replace(/\\n/g, '\n')}
                </div>

                <audio
                  ref={audioRef}
                  preload="auto"
                  style={{ display: 'none' }}
                />

                <div className="flex justify-center gap-2 mt-4">
                  {inputLetters.map((letter, idx) => (
                    <input
                      key={idx}
                      autoComplete='off'
                      id={`letter-${idx}`}
                      className={`w-10 border-b-2 text-center text-3xl focus:outline-none ${errorIndexes.includes(idx) ? 'border-red-500' : 'border-gray-400'
                        }`}
                      value={letter}
                      onChange={(e) => handleInput(e, idx)}
                    />
                  ))}
                </div>

                <div className="flex items-center gap-4 mt-8">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={showPhonetic}
                      onCheckedChange={() => setShowPhonetic(!showPhonetic)}
                    />
                    <label className="flex items-center cursor-pointer">
                      看音标
                    </label>
                  </div>
                  <button
                    onClick={handleAddToVocabulary}
                    disabled={isAddingToVocabulary || checkingVocabulary || isInVocabulary}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors cursor-pointer ${
                      isInVocabulary
                        ? 'bg-green-500 text-white cursor-default'
                        : 'bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed'
                    }`}
                  >
                    <BookA className="w-4 h-4" />
                    {checkingVocabulary
                      ? '检查中...'
                      : isAddingToVocabulary
                        ? '添加中...'
                        : isInVocabulary
                          ? '已在生词本'
                          : '加入生词本'
                    }
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2 cursor-pointer bg-primary text-white dark:bg-gray-800 rounded-lg" onClick={handleSkipWord}>
                    <SkipForward className="w-4 h-4" /> 跳过
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
