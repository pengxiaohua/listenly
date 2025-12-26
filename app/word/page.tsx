'use client';

import { useEffect, useState, useRef, useCallback, type KeyboardEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Volume2, BookA,
  Lightbulb, LightbulbOff,
  // SkipForward,
  Users, ChevronLeft, Hourglass, Clock, Baseline,
  Expand, Shrink
} from 'lucide-react';
import AuthGuard from '@/components/auth/AuthGuard'
import Image from 'next/image';

import { wordsTagsChineseMap, WordTags } from '@/constants'
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import Empty from '@/components/common/Empty';
import ExitPracticeDialog from '@/components/common/ExitPracticeDialog';
import { useGlobalLoadingStore } from '@/store'
import { formatLastStudiedTime } from '@/lib/timeUtils'

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
  learnersCount?: number
  _count: { words: number, done: number }
}

interface WordGroupSummary {
  id: number;
  name: string;
  kind: string;
  order: number;
  total: number;
  done: number;
  lastStudiedAt: string | null;
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
  const [selectedSet, setSelectedSet] = useState<WordSet | null>(null)
  const [wordGroups, setWordGroups] = useState<WordGroupSummary[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null)
  const [groupProgress, setGroupProgress] = useState<{ done: number; total: number } | null>(null)
  // const [currentWordSet, setCurrentWordSet] = useState<WordSet | null>(null)

  const [currentWords, setCurrentWords] = useState<Word[]>([]);
  const [currentWord, setCurrentWord] = useState<Word | null>(null);
  const [audioUrl, setAudioUrl] = useState('')
  const [userWordInputs, setUserWordInputs] = useState<string[]>([]);
  const [currentWordInputIndex, setCurrentWordInputIndex] = useState(0);
  const [wordInputStatus, setWordInputStatus] = useState<('pending' | 'correct' | 'wrong')[]>([]);
  const [showAnswer, setShowAnswer] = useState(false);
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
  const [showFullScreen, setShowFullScreen] = useState(false)
  const [showExitDialog, setShowExitDialog] = useState(false)

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
      const params = new URLSearchParams({
        category,
      })
      // 如果是虚拟分组（负数ID），不传 groupId，而是通过 offset 和 limit 来控制范围
      if (selectedGroupId && selectedGroupId > 0) {
        // 真实分组：使用 groupId
        params.set('groupId', String(selectedGroupId))
        params.set('limit', String(limit))
        params.set('offset', String(offset))
      } else if (selectedGroupId && selectedGroupId < 0) {
        // 虚拟分组：根据虚拟ID计算 offset
        // 虚拟ID = -(order)，所以 order = -selectedGroupId
        const virtualOrder = -selectedGroupId
        const virtualOffset = (virtualOrder - 1) * 20 + offset
        params.set('offset', String(virtualOffset))
        params.set('limit', String(limit))
      } else {
        // 没有分组：使用传入的 offset 和 limit
        params.set('limit', String(limit))
        params.set('offset', String(offset))
      }
      const response = await fetch(`/api/word/unfinished?${params.toString()}`);
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
  }, [selectedGroupId]);

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
  const fetchNextWord = useCallback(async (initialOffset?: number) => {
    if (currentTag === '') return
    setIsLoading(true)
    try {
      // 如果传入了 initialOffset，说明是重置，直接清空本地单词缓存
      let candidateWords = initialOffset === 0 ? [] : currentWords
      const targetOffset = initialOffset !== undefined ? initialOffset : currentOffset

      if (candidateWords.length === 0) {
        // 使用传入的 targetOffset 而不是 state 中的 currentOffset
        const { words, hasMore } = await loadWords(currentTag as string, targetOffset, 20)
        if (words.length === 0) {
          setIsCorpusCompleted(true)
          return
        }
        setCurrentWords(words)
        // 更新 offset，确保下一次加载更多时接得上
        setCurrentOffset(targetOffset + 20)
        setHasMoreWords(hasMore)
        candidateWords = words
      }

      if (candidateWords.length > 0) {
        // 不再随机，而是按列表顺序取第一个（后端已按顺序返回）
        const word = candidateWords[0]
        setCurrentWord(word)

        setTimeout(() => document.getElementById('word-input-0')?.focus(), 100)

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
    const { open, close } = useGlobalLoadingStore.getState()
    open('加载中...')
    fetch('/api/catalog')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setCatalogs(data.data)
        }
      })
      .catch(err => console.error('加载目录失败:', err))
      .finally(() => close())
  }, [])

  // 加载单词集列表的函数
  const loadWordSets = useCallback(() => {
    const params = new URLSearchParams()

    // 如果选择了"全部",则不传 catalogFirstId,获取所有单词集
    if (selectedFirstId && selectedFirstId !== 'ALL') {
      params.set('catalogFirstId', selectedFirstId)
    }
    if (selectedSecondId) params.set('catalogSecondId', selectedSecondId)
    if (selectedThirdId) params.set('catalogThirdId', selectedThirdId)

    return fetch(`/api/word/word-set?${params.toString()}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setWordSets(data.data)
        }
      })
      .catch(err => console.error('加载单词集失败:', err))
  }, [selectedFirstId, selectedSecondId, selectedThirdId])

  // 根据目录筛选加载单词集
  useEffect(() => {
    loadWordSets()
  }, [loadWordSets])


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
      // setSelectedWordSetId(idParam); // 删除未使用的状态
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
    params.set('set', idParam);
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

  useEffect(() => {
    if (!currentWord) {
      setUserWordInputs([])
      setWordInputStatus([])
      setCurrentWordInputIndex(0)
      return
    }

    const trimmedWord = currentWord.word.trim()
    if (!trimmedWord) {
      setUserWordInputs([])
      setWordInputStatus([])
      setCurrentWordInputIndex(0)
      return
    }

    const parts = trimmedWord.split(/\s+/)
    setUserWordInputs(Array(parts.length).fill(''))
    setWordInputStatus(Array(parts.length).fill('pending'))
    setCurrentWordInputIndex(0)
    setShowAnswer(false)

    setTimeout(() => {
      document.getElementById('word-input-0')?.focus()
    }, 100)
  }, [currentWord])

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
      // 如果当前在分组模式下，正确答题时本地进度 +1
      if (isCorrect && selectedGroupId) {
        setGroupProgress(prev => prev ? { done: prev.done + 1, total: prev.total } : prev)
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

  const normalizeWord = (value: string) => {
    return value.replace(/[.,!?:;()'"“”‘’\-]/g, '').toLowerCase().trim();
  };

  const finalizeCurrentWord = async () => {
    if (!currentWord) return;

    setCorrectCount(prev => prev + 1);
    playSound('/sounds/correct.mp3');

    let recordSuccess = true;
    if (currentWord.id) {
      recordSuccess = await recordWordResult(currentWord.id, true, 0);
      if (recordSuccess && currentTag) {
        loadCategoryStats(currentTag);
      }
    }

    const updatedWords = currentWords.filter(w => w.id !== currentWord.id);
    setCurrentWords(updatedWords);

    setTimeout(() => {
      if (updatedWords.length > 0) {
        // 不再随机，而是按列表顺序取第一个（后端已按顺序返回）
        const nextWord = updatedWords[0];
        setCurrentWord(nextWord);
        setTimeout(() => {
          document.getElementById('word-input-0')?.focus();
        }, 100);
        if (nextWord.id) {
          checkVocabularyStatus(nextWord.id)
        }
      } else {
        // 如果本地缓存的单词用完了，尝试加载下一页或结束
        if (hasMoreWords) {
          loadMoreWords().then(() => {
            // loadMoreWords 会更新 currentWords，fetchNextWord 会从 currentWords 中取词
            fetchNextWord()
          })
        } else {
          setCurrentWord(null);
          setIsCorpusCompleted(true);
        }
      }
    }, 500);
  };

  // 重置并重新开始
  const handleRestart = async () => {
    if (!currentTag || !selectedGroupId) return
    setIsLoading(true)
    try {
      const res = await fetch('/api/word/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wordSetSlug: currentTag,
          groupId: selectedGroupId
        })
      })
      const data = await res.json()
      if (data.success) {
        setIsCorpusCompleted(false)
        setCurrentWords([])
        setCurrentOffset(0)
        setHasMoreWords(true)

        // 重置本地进度状态
        setCorrectCount(0)
        if (selectedGroupId) {
          setGroupProgress(prev => prev ? { done: 0, total: prev.total } : null)
        }

        if (currentTag) {
          loadCategoryStats(currentTag)
        }
        // 显式传入 0，确保请求第一页数据
        await fetchNextWord(0)
      } else {
        toast.error(data.error || '重置失败')
      }
    } catch (error) {
      console.error('重置请求失败:', error)
      toast.error('重置请求失败')
    } finally {
      setIsLoading(false)
    }
  }

  const handleWordInputChange = (value: string, index: number) => {
    const prevValue = userWordInputs[index] || '';
    setUserWordInputs(prev => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
    setWordInputStatus(prev => {
      if (index >= prev.length) return prev;
      const next = [...prev];
      next[index] = 'pending';
      return next;
    });
    if (value.length > prevValue.length) {
      playSound('/sounds/typing.mp3');
    }
  };

  const handleWordInputKeyDown = async (e: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (!currentWord) return;
    if (e.key === ' ') {
      e.preventDefault();
      setShowAnswer(true);
      return;
    }
    if (e.key !== 'Enter') return;
    e.preventDefault();

    const parts = currentWord.word.trim().split(/\s+/).filter(Boolean);
    if (index >= parts.length) return;

    const targetWord = normalizeWord(parts[index]);
    const currentInput = normalizeWord(userWordInputs[index] || '');
    if (!targetWord) return;

    if (currentInput === targetWord) {
      setWordInputStatus(prev => {
        if (index >= prev.length) return prev;
        const next = [...prev];
        next[index] = 'correct';
        return next;
      });
      if (index < parts.length - 1) {
        playSound('/sounds/correct.mp3');
        setCurrentWordInputIndex(index + 1);
        setTimeout(() => {
          document.getElementById(`word-input-${index + 1}`)?.focus();
        }, 100);
      } else {
        await finalizeCurrentWord();
      }
    } else {
      setWordInputStatus(prev => {
        if (index >= prev.length) return prev;
        const next = [...prev];
        next[index] = 'wrong';
        return next;
      });
      playSound('/sounds/wrong.mp3');
      if (currentWord.id) {
        await recordWordResult(currentWord.id, false, 1);
      }
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
    // 统一改为 set/group，不再使用 name
    params.delete('name');
    router.push(`/word?${params.toString()}`);
  }

  // 返回词库分类选择（直接返回，不显示弹窗）
  function handleBackToTagList() {
    initializedTagRef.current = null
    setCurrentTag('')
    setCurrentWord(null)
    setCurrentWords([])
    setCurrentOffset(0)
    setHasMoreWords(true)
    setIsCorpusCompleted(false)
    // setSelectedWordSetId('') // 删除未使用的状态

    // 清除URL参数
    router.push('/word');
    // 重新加载课程列表以更新进度
    // 使用 setTimeout 确保在路由导航完成后加载
    setTimeout(() => {
      loadWordSets()
    }, 100)
  }

  // 处理返回按钮点击（显示弹窗）
  const handleBack = () => {
    setShowExitDialog(true)
  }

  // 返回当前课程详情（分组列表页）
  const handleBackToCourseDetail = () => {
    setShowExitDialog(false)
    if (setSlug) {
      const params = new URLSearchParams(searchParams.toString())
      params.set('set', setSlug)
      params.delete('group')
      router.push(`/word?${params.toString()}`)
    }
  }

  // 处理返回课程列表
  const handleBackToCourseList = () => {
    setShowExitDialog(false)
    handleBackToTagList()
  }

  // 处理继续学习
  const handleContinueLearning = () => {
    setShowExitDialog(false)
  }

  // 处理全屏切换
  const handleFullScreen = () => {
    setShowFullScreen(!showFullScreen)
  }

  // 根据全屏状态控制Header显示
  useEffect(() => {
    if (showFullScreen) {
      document.body.classList.add('word-fullscreen')
    } else {
      document.body.classList.remove('word-fullscreen')
    }
    // 清理函数：组件卸载时移除类
    return () => {
      document.body.classList.remove('word-fullscreen')
    }
  }, [showFullScreen])

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
  // 统一 URL 模式：?set=slug[&group=n]
  const setSlug = searchParams.get('set') || ''
  const groupOrderParam = searchParams.get('group')

  // 当通过 URL 选择了词集但未选择分组时，加载分组列表
  useEffect(() => {
    if (!setSlug) return
    fetch(`/api/word/group?wordSet=${encodeURIComponent(setSlug)}`)
      .then(res => res.json())
      .then(res => {
        const groups = (Array.isArray(res.data) ? res.data : []) as WordGroupSummary[]
        setWordGroups(groups)
        // 优先从现有列表中找该集合；找不到则拉全量再匹配
        const fromList = wordSets.find(ws => ws.slug === setSlug)
        if (fromList) {
          setSelectedSet(fromList)
        } else {
          fetch('/api/word/word-set')
            .then(r => r.json())
            .then(all => {
              const found = (all?.data || all)?.find?.((ws: WordSet) => ws.slug === setSlug)
              if (found) setSelectedSet(found)
            }).catch(() => { })
        }
        if (groupOrderParam) {
          const orderNum = parseInt(groupOrderParam)
          const match = (groups as Array<{ id: number; order: number; total: number; done: number }>).find((g) => g.order === orderNum)
          if (match) {
            setSelectedGroupId(match.id)
            setGroupProgress({ done: match.done, total: match.total })
            // 设置类别为 slug 并进入学习
            handleTagChange(setSlug as WordTags)
          }
          // 如果是虚拟分组，会在下面的 useEffect 中处理
        } else {
          // 未选择分组时不进入学习
          setSelectedGroupId(null)
          setCurrentTag('' as WordTags)
        }
      })
      .catch(() => { })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setSlug, groupOrderParam])

  // 处理虚拟分组选择（当没有真实分组时）
  useEffect(() => {
    if (!setSlug || !groupOrderParam || !selectedSet || wordGroups.length > 0) return

    const orderNum = parseInt(groupOrderParam)
    if (isNaN(orderNum)) return

    // 计算虚拟分组
    const totalWords = selectedSet._count?.words || 0
    if (totalWords === 0) return

    const groupSize = 20
    const groupCount = Math.ceil(totalWords / groupSize)
    if (orderNum > groupCount) return

    // 创建虚拟分组
    const start = (orderNum - 1) * groupSize + 1
    const end = Math.min(orderNum * groupSize, totalWords)
    const groupTotal = end - start + 1

    // 设置虚拟分组ID（负数）
    setSelectedGroupId(-orderNum)
    setGroupProgress({ done: 0, total: groupTotal })
    // 设置类别为 slug 并进入学习
    handleTagChange(setSlug as WordTags)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setSlug, groupOrderParam, selectedSet, wordGroups.length])

  // 计算虚拟分组（当没有真实分组时，按每20个一组划分）
  const virtualGroups = (() => {
    if (wordGroups.length > 0 || !selectedSet) return []
    const totalWords = selectedSet._count?.words || 0
    if (totalWords === 0) return []
    const groupSize = 20
    const groupCount = Math.ceil(totalWords / groupSize)
    return Array.from({ length: groupCount }, (_, i) => {
      const start = i * groupSize + 1
      const end = Math.min((i + 1) * groupSize, totalWords)
      const groupTotal = end - start + 1
      return {
        id: -(i + 1), // 使用负数作为虚拟ID
        name: `第${i + 1}组`,
        kind: 'SIZE',
        order: i + 1,
        total: groupTotal,
        done: 0, // 虚拟分组无法获取真实进度，显示为0
        lastStudiedAt: null,
        start, // 添加起始序号
        end, // 添加结束序号
      } as WordGroupSummary & { start: number; end: number }
    })
  })()

  // 合并真实分组和虚拟分组
  const displayGroups = wordGroups.length > 0 ? wordGroups : virtualGroups

  // 获取可选的二级目录
  const availableSeconds = selectedFirstId && selectedFirstId !== 'ALL'
    ? catalogs.find(c => c.id === parseInt(selectedFirstId))?.seconds || []
    : []

  // 获取可选的三级目录
  const availableThirds = selectedSecondId && selectedSecondId !== 'NONE'
    ? availableSeconds.find(s => s.id === parseInt(selectedSecondId))?.thirds || []
    : []

  const currentWordParts = currentWord ? currentWord.word.trim().split(/\s+/) : [];

  return (
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

      <audio
        ref={audioRef}
        preload="auto"
        autoPlay
        playsInline
        style={{ display: 'none' }}
      />
      {/* 顶部级联筛选导航 */}
      {!currentTag && !setSlug && (
        <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
          <div className="container mx-auto py-3">
            {/* 一级目录 */}
            <div className="flex gap-2 mb-2 overflow-x-auto">
              <button
                onClick={() => {
                  setSelectedFirstId('ALL')
                  setSelectedSecondId('')
                  setSelectedThirdId('')
                }}
                className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors cursor-pointer ${selectedFirstId === 'ALL'
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
                  className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors cursor-pointer ${selectedFirstId === String(cat.id)
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
                  className={`px-3 py-1.5 text-sm rounded-lg whitespace-nowrap transition-colors cursor-pointer ${!selectedSecondId
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
                    className={`px-3 py-1.5 text-sm rounded-lg whitespace-nowrap transition-colors cursor-pointer ${selectedSecondId === String(cat.id)
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
                  className={`px-3 py-1.5 text-sm rounded-lg whitespace-nowrap transition-colors cursor-pointer ${!selectedThirdId
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
                    className={`px-3 py-1.5 text-sm rounded-lg whitespace-nowrap transition-colors cursor-pointer ${selectedThirdId === String(cat.id)
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
      {((selectedGroupId && currentTag) || (!setSlug && currentTag)) && (
        <div className="container mx-auto mt-6">
          <Progress value={groupProgress ? (groupProgress.done / (groupProgress.total || 1)) * 100 : (correctCount / (totalWords || 1)) * 100} className="w-full h-3" />
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600">学习进度</span>
            <span className="text-sm text-gray-600">
              {groupProgress ? `${groupProgress.done} / ${groupProgress.total}` : `${correctCount} / ${totalWords}`}
              {isLoadingMore && (
                <span className="text-xs text-gray-500 ml-2">
                  正在加载更多单词...
                </span>
              )}
            </span>
          </div>
        </div>
      )}

      <div className="container mx-auto py-4">
        {!currentTag ? (
          <div className="mb-4">
            {/* 选择了集合：在分组列表页顶部展示集合详情 */}
            {setSlug && (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button onClick={handleBackToTagList} className="px-2 py-2 mb-4 bg-gray-200 dark:bg-gray-800 rounded-full cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors flex items-center justify-center">
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
                      <span> 共 {displayGroups.length} 组</span>
                      <span>单词数：{selectedSet?._count?.words ?? displayGroups.reduce((s, g) => s + g.total, 0)}</span>
                      <span>总进度：{
                        (() => { const done = displayGroups.reduce((s, g) => s + g.done, 0); const total = displayGroups.reduce((s, g) => s + g.total, 0); return `${done}/${total || 0}` })()
                      }</span>
                    </div>
                    <div className="flex items-center gap-2 mt-4">
                      <div className="text-sm flex items-center text-gray-500">
                        <Users className='w-4 h-4' />
                        <span className='ml-1'>{selectedSet?.learnersCount}人</span>
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

            {/* 单词课程包列表（当未选择集合时） */}
            {!setSlug && wordSets.length > 0 ? (
              <div className="flex flex-wrap gap-4 md:gap-3">
                {wordSets.map((ws) => (
                  <div
                    key={ws.id}
                    onClick={() => router.push(`/word?set=${ws.slug}`)}
                    className="w-full sm:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.6666rem)] xl:w-[calc(25%-0.8333rem)] 2xl:p-4 p-3 bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm hover:shadow-md hover:bg-gray-100 dark:hover:bg-gray-600 transition-shadow cursor-pointer border border-gray-200 dark:border-gray-400 group"
                  >
                    <div className="flex h-full">
                      {/* 课程封面 - 左侧 */}
                      <div className="relative w-[110px] h-[156px] rounded-lg mr-2 3xl:mr-3 flex-shrink-0 bg-gradient-to-br from-blue-400 to-purple-500">
                        {ws.coverImage ? (
                          <Image
                            fill
                            src={(ws.coverImage || '').trim()}
                            alt={ws.name}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white text-lg font-bold px-4">
                            {ws.name}
                          </div>
                        )}
                      </div>
                      {/* 课程信息 - 右侧 */}
                      <div className="flex-1 flex flex-col justify-between">
                        <div>
                          <h3 className="font-bold text-lg mb-2 line-clamp-2">{ws.name}</h3>
                          <div className='flex items-center gap-3 text-sm text-gray-500'>
                            <div className="flex items-center">
                              <Baseline className='w-4 h-4' />
                              <p>{ws._count.words} 词</p>
                            </div>
                            <div className="flex items-center">
                              <Users className='w-4 h-4' />
                              <p className='ml-1'>{ws.learnersCount ?? 0}人</p>
                            </div>
                          </div>
                          <div className='mt-2'>
                            {ws.isPro ? (
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
                          <div className='text-sm text-gray-500 mb-1'>进度：{ws._count.done > 0 ? `${ws._count.done}/${ws._count.words}` : '未开始'}</div>
                          <Progress value={ws._count.done / ws._count.words * 100} className="w-full h-2" />
                        </div>

                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (!setSlug ? (
              <div className="text-center py-20 text-gray-400">
                <Empty text="暂无课程包" />
              </div>
            ) : null)}

            {/* 分组选择页：当URL存在 set 但无 group 时展示 */}
            {setSlug && !groupOrderParam && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {displayGroups.map((g: WordGroupSummary & { start?: number; end?: number }) => {
                  const isVirtual = g.id < 0
                  const displayText = g.kind === 'SIZE' || isVirtual
                    ? (() => {
                      if (isVirtual && g.start && g.end) {
                        return `${g.start}-${g.end}`
                      }
                      const idx = displayGroups.findIndex(gg => gg.id === g.id)
                      const prevTotal = idx > 0 ? displayGroups.slice(0, idx).reduce((s, gg) => s + gg.total, 0) : 0
                      const start = prevTotal + 1
                      const end = start + g.total - 1
                      return `${start}-${end}`
                    })()
                    : <>第{g.order}组</>
                  return (
                    <button key={g.id}
                      onClick={() => {
                        const params = new URLSearchParams(searchParams.toString())
                        params.set('set', setSlug)
                        params.set('group', String(g.order))
                        router.push(`/word?${params.toString()}`)
                      }}
                      className="text-left p-4 border rounded hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                      <div className="text-2xl font-semibold">{g.name}</div>
                      <div className="text-base text-gray-500 mt-1">
                        {displayText}
                      </div>
                      <div className='flex gap-4'>
                        <div className="text-base text-gray-500 mt-1 flex items-center">
                          <Hourglass className='w-4 h-4' />
                          <span className='ml-1'>{g.done}/{g.total}</span>
                        </div>
                        {!isVirtual && (
                          <div className="text-base text-gray-500 mt-1 flex items-center">
                            <Clock className='w-4 h-4' />
                            <span className='ml-1'>{formatLastStudiedTime(g.lastStudiedAt)}</span>
                          </div>
                        )}
                        {g.done >= g.total && (
                          <div className="text-xs border bg-green-500 text-white rounded-full px-3 py-1 flex items-center justify-center">
                            已完成
                          </div>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}

          </div>
        ) : (
          <div className="mb-4 flex items-center gap-4 justify-between">
            {/* <span>当前课程：<b>{currentWordSet?.name || wordsTagsChineseMap[currentTag as WordTags] || currentTag}</b></span> */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button onClick={handleBack} className="px-2 py-2 bg-gray-200 dark:bg-gray-800 rounded-full cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors flex items-center justify-center">
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
                      // 如果没有OSS发音，则使用语音合成
                      if (!audioRef?.current || !audioUrl) {
                        speakWord(currentWord?.word || '', 'en-US')
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
                    className="px-2 py-2 bg-gray-200 rounded-full cursor-pointer hover:bg-gray-300"
                  >
                    <Volume2 className={`w-6 h-6 cursor-pointer ${isPlaying ? 'text-blue-500' : ''}`} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" sideOffset={6}>朗读单词</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => {
                      setShowPhonetic(!showPhonetic)
                    }}
                    className="px-2 py-2 bg-gray-200 rounded-full cursor-pointer hover:bg-gray-300"
                  >
                    {showPhonetic ? <LightbulbOff className='w-6 h-6' /> : <Lightbulb className='w-6 h-6' />}
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  {showPhonetic ? '隐藏音标' : '显示音标'}
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleAddToVocabulary}
                    disabled={isAddingToVocabulary || checkingVocabulary || isInVocabulary}
                    className={`flex items-center gap-2 p-2 rounded-full transition-colors cursor-pointer ${isInVocabulary
                      ? 'bg-green-100 cursor-default'
                      : 'px-2 py-2 bg-gray-200 hover:bg-gray-300'
                      }`}
                  >
                    <BookA className={`w-6 h-6 ${checkingVocabulary || isAddingToVocabulary ? 'opacity-50' : ''
                      } ${isInVocabulary ? 'text-green-600' : 'cursor-pointer text-gray-600'
                      }`} />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  {checkingVocabulary
                    ? '检查中...'
                    : isAddingToVocabulary
                      ? '添加中...'
                      : isInVocabulary
                        ? '已在生词本'
                        : '加入生词本'
                  }
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className="px-2 py-2 bg-gray-200 hover:bg-gray-300 rounded-full cursor-pointer"
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
          </div>
        )}
        {currentTag && selectedGroupId && (
          <div className='flex flex-col items-center h-[calc(100vh-300px)] justify-center'>
            {isCorpusCompleted ? (
              <div className="text-2xl font-bold text-green-600 flex flex-col items-center gap-6">
                <div>恭喜！你已完成这一组所有单词！</div>
                <div className="flex gap-4 text-lg">
                  <button
                    onClick={handleBack}
                    className="px-6 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-gray-700 font-medium transition-colors cursor-pointer"
                  >
                    返回
                  </button>
                  <button
                    onClick={handleRestart}
                    className="px-6 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-white font-medium transition-colors cursor-pointer"
                  >
                    重新开始
                  </button>
                  {/* 下一组按钮 */}
                  {(() => {
                    const currentOrder = groupOrderParam ? parseInt(groupOrderParam) : NaN
                    const maxOrder = wordGroups.reduce((m, g) => Math.max(m, g.order), 0)
                    const hasNext = Number.isFinite(currentOrder) && currentOrder < maxOrder
                    if (hasNext) {
                      return (
                        <button
                          onClick={() => {
                            if (!setSlug) return
                            router.push(`/word?set=${setSlug}&group=${currentOrder + 1}`)
                          }}
                          className="px-6 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white font-medium transition-colors cursor-pointer"
                        >
                          下一组
                        </button>
                      )
                    }
                    return null
                  })()}
                </div>
              </div>
            ) : isLoading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                <span className="ml-2">加载中...</span>
              </div>
            ) : !currentWord ? (
              <div className="text-xl font-bold text-green-600 flex flex-col items-center gap-6">
                <div>恭喜！你已完成这一组所有单词！</div>
                <div className="flex gap-4">
                  <button
                    onClick={handleBack}
                    className="px-6 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-gray-700 font-medium transition-colors cursor-pointer"
                  >
                    返回
                  </button>
                  <button
                    onClick={handleRestart}
                    className="px-6 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-white font-medium transition-colors cursor-pointer"
                  >
                    重新开始
                  </button>
                  {/* 下一组按钮 */}
                  {(() => {
                    const currentOrder = groupOrderParam ? parseInt(groupOrderParam) : NaN
                    const maxOrder = wordGroups.reduce((m, g) => Math.max(m, g.order), 0)
                    const hasNext = Number.isFinite(currentOrder) && currentOrder < maxOrder
                    if (hasNext) {
                      return (
                        <button
                          onClick={() => {
                            if (!setSlug) return
                            router.push(`/word?set=${setSlug}&group=${currentOrder + 1}`)
                          }}
                          className="px-6 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white font-medium transition-colors cursor-pointer"
                        >
                          下一组
                        </button>
                      )
                    }
                    return null
                  })()}
                </div>
              </div>
            ) : (
              <>
                <div className="flex h-6 justify-center items-center gap-3 text-gray-400">
                  {
                    !!currentWord?.phoneticUS && showPhonetic &&
                    <div className=' text-gray-600 rounded-md px-[6px] py-[2px]'>/{currentWord?.phoneticUS}/</div>
                  }
                </div>

                <div className="flex justify-center mt-4 text-2xl text-gray-600 whitespace-pre-line">
                  {currentWord && currentWord.translation.replace(/\\n/g, '\n')}
                </div>

                <div className="text-gray-500 mt-2">
                  {(showAnswer && currentWord) ? currentWord.word : ''}
                </div>

                <div className="flex flex-wrap justify-center gap-3 mt-4">
                  {currentWordParts.map((part, idx) => {
                    const minWidth = 3;
                    const width = Math.max(minWidth, part.length + 2);
                    const status = wordInputStatus[idx] || 'pending';
                    const borderClass = status === 'correct'
                      ? 'border-green-500 text-green-500'
                      : status === 'wrong'
                        ? 'border-red-500 text-red-500'
                        : 'border-gray-400 text-gray-600';

                    return (
                      <div key={idx}>
                        <input
                          autoComplete="off"
                          id={`word-input-${idx}`}
                          spellCheck={false}
                          translate="no"
                          data-gramm="false"
                          data-lt-active="false"
                          data-ms-editor="false"
                          className={`border-b-3 text-center text-3xl font-medium focus:outline-none bg-transparent transition-colors ${borderClass}`}
                          style={{
                            width: `${width}ch`,
                            minWidth: `${Math.max(minWidth, 3)}ch`,
                            padding: '0 0.5em'
                          }}
                          value={userWordInputs[idx] || ''}
                          onChange={(e) => handleWordInputChange(e.target.value, idx)}
                          onKeyDown={(e) => handleWordInputKeyDown(e, idx)}
                          disabled={idx !== currentWordInputIndex}
                          autoFocus={idx === currentWordInputIndex}
                        />
                      </div>
                    )
                  })}
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
                            <path d="M20 4V10C20 11.0609 19.5786 12.0783 18.8284 12.8284C18.0783 13.5786 17.0609 14 16 14H4M4 14L8 10M4 14L8 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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
  );
}
