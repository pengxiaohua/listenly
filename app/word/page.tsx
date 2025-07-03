'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { Volume2, Loader2 } from 'lucide-react';
import AuthGuard from '@/components/auth/AuthGuard'

import { wordsTagsChineseMap, WordTags } from '@/constants'
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { useAuthStore } from '@/store/auth'

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
  const [inputLetters, setInputLetters] = useState<string[]>([]);
  const [errorIndexes, setErrorIndexes] = useState<number[]>([]);
  const [correctCount, setCorrectCount] = useState(0);
  const [showPhonetic, setShowPhonetic] = useState(false);
  const [isSlow, setIsSlow] = useState(false);
  const [totalWords, setTotalWords] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [currentOffset, setCurrentOffset] = useState(0);
  const [hasMoreWords, setHasMoreWords] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const isLogged = useAuthStore(state => state.isLogged);

  const synthRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    // 在组件挂载后初始化
    synthRef.current = window.speechSynthesis;
  }, []);

  const initializedRef = useRef(false);

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
    utterance.rate = isSlow ? 0.1 : 1;
    synthRef.current?.speak(utterance);
  }, [isSlow]);

  const pickRandomWord = useCallback((wordsArray: Word[]) => {
    const word = wordsArray[Math.floor(Math.random() * wordsArray.length)];
    setCurrentWord(word);
    setInputLetters(Array(word.word.length).fill(''));
    setErrorIndexes([]);

    setTimeout(() => document.getElementById('letter-0')?.focus(), 100);
    speakWord(word.word, 'en-US');

    // 当剩余单词较少时，预加载更多单词
    if (wordsArray.length <= 5 && hasMoreWords && !isLoadingMore) {
      loadMoreWords();
    }
  }, [speakWord, setCurrentWord, setInputLetters, setErrorIndexes, hasMoreWords, isLoadingMore, loadMoreWords]);

  useEffect(() => {
    // 如果已经初始化过，直接返回
    if (initializedRef.current) return;

    const initializeData = async () => {
      setIsLoading(true);
      try {
        const tagKeys = Object.keys(wordsTagsChineseMap);
        setTags(tagKeys as WordTags[]);
        if (tagKeys.length > 0) {
          const initialTag = tagKeys[0] as WordTags;
          setCurrentTag(initialTag);

          // 加载初始分类的统计信息
          await loadCategoryStats(initialTag);

          // 使用分页方式加载未完成单词（初始加载20个）
          const { words, hasMore } = await loadWords(initialTag, 0, 20);
          setCurrentWords(words);
          setCurrentOffset(0);
          setHasMoreWords(hasMore);

          if (words.length > 0) {
            pickRandomWord(words);
          }
        }
      } catch (error) {
        console.error("初始化数据失败:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeData();

    // 标记为已初始化
    initializedRef.current = true;
  }, [loadCategoryStats, loadWords, pickRandomWord]);

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
      console.log({ errorIndexes })

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
          pickRandomWord(updatedWords);
        } else {
          // 如果没有更多未完成的单词，显示完成信息
          setCurrentWord(null);
        }
      }, 500);
    }
  };

  const handleTagClick = async (tag: string) => {
    setIsLoading(true);
    setCurrentTag(tag as WordTags);
    console.log('handleTagClick', tag)
    try {
      // 加载统计信息
      await loadCategoryStats(tag);

      // 使用分页方式切换分类时重新获取未完成单词（初始加载20个）
      const { words, hasMore } = await loadWords(tag, 0, 20);
      setCurrentWords(words);
      setCurrentOffset(0);
      setHasMoreWords(hasMore);

      if (words.length > 0) {
        pickRandomWord(words);
      } else {
        setCurrentWord(null);  // 显示完成信息
      }
    } catch (error) {
      console.error("加载未完成单词失败:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // 跳过单词时也记录结果
  const handleSkipWord = () => {
    if (!currentWord?.id) return;

    // 记录跳过的单词为未完成
    recordWordResult(currentWord.id, false, 0);

    // 从当前单词列表中移除已跳过的单词
    const updatedWords = currentWords.filter(w => w.id !== currentWord.id);
    setCurrentWords(updatedWords);

    if (updatedWords.length > 0) {
      pickRandomWord(updatedWords);
    } else {
      setCurrentWord(null);  // 显示完成信息
    }
  };

  // 添加完成提示
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span>加载中...</span>
      </div>
    );
  }

  if (!currentWord && currentWords.length === 0 && isLogged) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">恭喜你！</h2>
          <p className="mb-4">你已完成当前分类的所有单词</p>
          <button
            className="px-4 py-2 bg-primary text-white rounded"
            onClick={() => handleTagClick(currentTag as string)}
          >
            重新开始
          </button>
        </div>
      </div>
    );
  }

  return (
    <AuthGuard>
      {/* 进度条区域 */}
      <div className="max-w-4xl mx-auto mt-6">
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
      <div className="max-w-4xl mx-auto flex gap-4 mt-20">
        <div className="w-1/5 p-4 border rounded shadow">
          <h3 className="font-semibold mb-4 text-center">词库分类</h3>
          {tags.map(tag => (
            <button
              key={tag}
              className={`block w-full text-left p-2 cursor-pointer rounded mb-2 ${tag === currentTag ? 'bg-primary text-primary-foreground' : 'bg-gray-200'}`}
              onClick={() => handleTagClick(tag)}
            >
              {wordsTagsChineseMap[tag as WordTags]}
            </button>
          ))}
        </div>

        <div className="w-4/5 p-6 border rounded shadow relative">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">单词拼写练习</h2>
            <div className='flex items-center gap-4'>
              <div className="flex items-center gap-2">
                <Switch
                  checked={showPhonetic}
                  onCheckedChange={() => setShowPhonetic(!showPhonetic)}
                />
                <label className="flex items-center cursor-pointer">
                  看音标
                </label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={isSlow}
                  onCheckedChange={() => setIsSlow(!isSlow)}
                />
                <label className="flex items-center cursor-pointer">
                  慢速🐢
                </label>
              </div>
            </div>
          </div>

          <div className='flex justify-center items-center gap-3 mt-30 text-gray-400'>
            <div className='flex items-center cursor-pointer' onClick={() => currentWord && speakWord(currentWord.word, 'en-GB')}>
              UK&nbsp;<Volume2 />
            </div>
            {
              !!currentWord?.phoneticUK && showPhonetic &&
              <div className='bg-gray-400 text-white rounded-md px-[6px] py-[2px]'>/{currentWord?.phoneticUK}/</div>
            }
            <div className='flex items-center cursor-pointer' onClick={() => currentWord && speakWord(currentWord.word, 'en-US')}>
              US&nbsp;<Volume2 />
            </div>
            {
              !!currentWord?.phoneticUS && showPhonetic &&
              <div className='bg-gray-400 text-white rounded-md px-[6px] py-[2px]'>/{currentWord?.phoneticUS}/</div>
            }
          </div>

          <div className="flex justify-center mt-4 text-gray-600 whitespace-pre-line">
            {currentWord && currentWord.translation.replace(/\\n/g, '\n')}
          </div>

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

          <div className="absolute bottom-6 right-6 flex justify-center gap-2">
            <button className="px-4 py-2 cursor-pointer bg-primary text-white rounded" onClick={handleSkipWord}>
              跳过 ⏭️
            </button>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
