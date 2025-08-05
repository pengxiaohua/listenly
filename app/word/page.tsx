'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { Volume2, BookA, SkipForward } from 'lucide-react';
import AuthGuard from '@/components/auth/AuthGuard'

import { wordsTagsChineseMap, WordTags, wordsTagsInfo } from '@/constants'
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';

import { toast } from "sonner";


interface Word {
  id: string;
  word: string;
  translation: string;
  phoneticUS: string;
  phoneticUK: string;
  definition: string;
  category: string;
}

export default function WordPage() {
  const [tags, setTags] = useState<WordTags[]>([]);
  const [currentTag, setCurrentTag] = useState<WordTags | ''>('');
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
    console.log('fetchNextWord')
    if (currentTag === '') return
    setIsLoading(true)
    try {
      // 检查是否还有未完成的单词
      if (currentWords.length === 0) {
        // 尝试加载更多单词
        const { words, hasMore } = await loadWords(currentTag as string, currentOffset, 20);
        if (words.length === 0) {
          setIsCorpusCompleted(true)
          setIsLoading(false)
          return
        }
        setCurrentWords(words)
        setCurrentOffset(prev => prev + 20)
        setHasMoreWords(hasMore)
      }

      // 从当前单词列表中随机选择一个
      if (currentWords.length > 0) {
        const randomIndex = Math.floor(Math.random() * currentWords.length)
        const word = currentWords[randomIndex]
        setCurrentWord(word)
        setInputLetters(Array(word.word.length).fill(''))
        setErrorIndexes([])

        setTimeout(() => document.getElementById('letter-0')?.focus(), 100)
        // speakWord(word.word, 'en-US')

        // 检查当前单词是否在生词本中
        if (word.id) {
          checkVocabularyStatus(word.id)
        }

        // 当剩余单词较少时，预加载更多单词
        if (currentWords.length <= 5 && hasMoreWords && !isLoadingMore) {
          loadMoreWords()
        }
      }

      setIsLoading(false)
    } catch (error) {
      console.error('获取单词失败:', error)
      setIsLoading(false)
    }
  }, [currentTag, currentWords, currentOffset, hasMoreWords, isLoadingMore, loadWords, loadMoreWords, checkVocabularyStatus])

  // 获取词库分类列表
  useEffect(() => {
    const tagKeys = Object.keys(wordsTagsChineseMap)
    setTags(tagKeys as WordTags[])
  }, [])

  // 选择词库分类后获取一个随机未完成的单词
  useEffect(() => {
    if (!currentTag) return
    loadCategoryStats(currentTag)
    fetchNextWord()
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
  const recordWordResult = async (wordId: string, isCorrect: boolean, errorCount: number) => {
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
      }
    } catch (error) {
      console.error('记录拼写结果失败:', error);
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

    if (newInputLetters.join('').toLowerCase() === currentWord.word.toLowerCase()) {
      setCorrectCount(prev => prev + 1);
      playSound('/sounds/correct.mp3');

      // 记录正确拼写结果
      if (currentWord.id) {
        recordWordResult(currentWord.id, true, 0);
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
    setCurrentTag(tag)
    setCurrentWord(null)
    setCurrentWords([])
    setCurrentOffset(0)
    setHasMoreWords(true)
    setIsCorpusCompleted(false)
  }

  // 返回词库分类选择
  function handleBackToTagList() {
    setCurrentTag('')
    setCurrentWord(null)
    setCurrentWords([])
    setCurrentOffset(0)
    setHasMoreWords(true)
    setIsCorpusCompleted(false)
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

  return (
    <AuthGuard>
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
            <h2 className="text-2xl font-bold mb-4">选择词库分类：</h2>
            <div className="flex flex-wrap justify-between">
              {tags.map((tag) => (
                <div
                  key={tag}
                  onClick={() => handleTagChange(tag)}
                  className="w-[32%] my-2 p-5 bg-gray-200 rounded-lg cursor-pointer hover:bg-gray-300"
                >
                  <div className="text-center text-xl mb-3">{wordsTagsChineseMap[tag as WordTags]}</div>
                  <div className="text-center text-base text-gray-500">{wordsTagsInfo[tag as WordTags].count} 个单词</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="mb-4 flex items-center gap-4">
            <span>当前词库：<b>{wordsTagsChineseMap[currentTag as WordTags]}</b></span>
            <button onClick={handleBackToTagList} className="px-2 py-1 bg-gray-200 rounded-lg cursor-pointer hover:bg-gray-300">返回词库选择</button>
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
                      if (!audioRef.current || !audioUrl) {
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
                  {
                    !!currentWord?.phoneticUS && showPhonetic &&
                    <div className='bg-gray-400 text-white rounded-md px-[6px] py-[2px]'>/{currentWord?.phoneticUS}/</div>
                  } */}
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
                  {/* <div className="flex items-center gap-2">
                    <Switch
                      checked={showPhonetic}
                      onCheckedChange={() => setShowPhonetic(!showPhonetic)}
                    />
                    <label className="flex items-center cursor-pointer">
                      看音标
                    </label>
                  </div> */}
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
