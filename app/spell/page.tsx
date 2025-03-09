
'use client';

import { useEffect, useState, useRef } from 'react';
import { wordsTagsChineseMap } from '@/constants'
import { Switch } from '@/components/ui/switch';

interface Word {
  id: string;
  word: string;
  translation: string;
  phoneticUS: string;
  phoneticUK: string;
  definition: string;
  category: string;
}

export default function Words() {
  const [wordTags, setWordTags] = useState<{ [tag: string]: Word[] }>({});
  const [tags, setTags] = useState<string[]>([]);
  const [currentTag, setCurrentTag] = useState<string>('');
  const [currentWords, setCurrentWords] = useState<Word[]>([]);
  const [currentWord, setCurrentWord] = useState<Word | null>(null);
  const [inputLetters, setInputLetters] = useState<string[]>([]);
  const [errorIndexes, setErrorIndexes] = useState<number[]>([]);
  const [correctCount, setCorrectCount] = useState(0);
  const [showPhonetic, setShowPhonetic] = useState(false);
  const [isSlow, setIsSlow] = useState(false);
  const [totalWords, setTotalWords] = useState(0);
  const synthRef = useRef(typeof window !== 'undefined' ? window.speechSynthesis : null);

  useEffect(() => {

    const tagKeys = Object.keys(wordsTagsChineseMap);
    setTags(tagKeys);
    setCurrentTag(tagKeys[0]);

    const loadUnfinishedWords = async (category: string) => {
      try {
        const response = await fetch(`/api/words/unfinished?category=${category}`);
        const data = await response.json();

        if (data.words) {
          // 更新当前分类的未完成单词
          setCurrentWords(data.words);
          if (data.words.length > 0) {
            pickRandomWord(data.words);
          }
        }

        await loadCategoryStats(tagKeys[0]);

      } catch (error) {
        console.error("加载未完成单词失败:", error);
      }
    };

    loadUnfinishedWords(tagKeys[0]);  // 加载第一个分类的未完成单词
  }, []);

  // 获取统计信息的函数
  const loadCategoryStats = async (category: string) => {
    try {
      const response = await fetch(`/api/word-records/stats?category=${category}`);
      const data = await response.json();

      if (data.success) {
        setCorrectCount(data.data.completed);
        setTotalWords(data.data.total);
      }
    } catch (error) {
      console.error("获取统计信息失败:", error);
    }
  };

  // 记录单词拼写结果
  const recordWordResult = async (wordId: string, isCorrect: boolean, errorCount: number) => {
    try {
      const response = await fetch('/api/word-records/create', {
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

  const pickRandomWord = (wordsArray: Word[]) => {
    const word = wordsArray[Math.floor(Math.random() * wordsArray.length)];
    setCurrentWord(word);
    setInputLetters(Array(word.word.length).fill(''));
    setErrorIndexes([]);
    setShowPhonetic(false);
    setTimeout(() => document.getElementById('letter-0')?.focus(), 100);
    speakWord(word.word, 'en-US');
  };

  const speakWord = (text: string, lang: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = isSlow ? 0.1 : 1;
    synthRef.current?.speak(utterance);
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
        await recordWordResult(currentWord.id, false, errorIndexes.length + 1);  // +1 包含当前错误
      }
    } else {
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
        recordWordResult(currentWord.id, true, errorIndexes.length);
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
    setCurrentTag(tag);

    // 加载统计信息
    await loadCategoryStats(tag);

    // 切换分类时重新获取未完成单词
    try {
      const response = await fetch(`/api/words/unfinished?category=${tag}`);
      const data = await response.json();

      if (data.words) {
        setCurrentWords(data.words);
        if (data.words.length > 0) {
          pickRandomWord(data.words);
        } else {
          setCurrentWord(null);  // 显示完成信息
        }
      }
    } catch (error) {
      console.error("加载未完成单词失败:", error);
    }
  };

  // 跳过单词时也记录结果
  const handleSkipWord = () => {
    if (!currentWord?.id) return;

    // 记录跳过的单词为未完成
    recordWordResult(currentWord.id, false, errorIndexes.length);

    // 从当前单词列表中移除已跳过的单词
    const updatedWords = currentWords.filter(w => w.id !== currentWord.id);
    setCurrentWords(updatedWords);

    if (updatedWords.length > 0) {
      pickRandomWord(updatedWords);
    } else {
      setCurrentWord(null);  // 显示完成信息
    }
  };

  const handleShowPhonetic = () => {
    setShowPhonetic(true);
    setTimeout(() => setShowPhonetic(false), 3000);
  };

  // 添加完成提示
  if (!currentWord && currentWords.length === 0) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">恭喜你！</h2>
          <p className="mb-4">你已完成当前分类的所有单词</p>
          <button
            className="px-4 py-2 bg-primary text-white rounded"
            onClick={() => handleTagClick(currentTag)}
          >
            重新开始
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto flex gap-4 mt-20">
      <div className="w-1/5 p-4 border rounded shadow">
        <h3 className="font-semibold mb-4 text-center">词库分类</h3>
        {tags.map(tag => (
          <button
            key={tag}
            className={`block w-full text-left p-2 cursor-pointer rounded mb-2 ${tag === currentTag ? 'bg-primary text-primary-foreground' : 'bg-gray-200'}`}
            onClick={() => handleTagClick(tag)}
          >
            {wordsTagsChineseMap[tag]}
          </button>
        ))}
      </div>

      <div className="w-4/5 p-6 border rounded shadow relative">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">单词拼写练习</h2>
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
        <div className="flex justify-center mt-20 text-gray-600 whitespace-pre-line">
          {currentWord.translation.replace(/\\n/g, '\n')}
        </div>

        <div className="flex justify-center gap-2 mt-4">
          {inputLetters.map((letter, idx) => (
            <input
              key={idx}
              autoComplete='off'
              id={`letter-${idx}`}
              className={`w-10 border-b-2 text-center text-xl focus:outline-none ${errorIndexes.includes(idx) ? 'border-red-500' : 'border-gray-400'
                }`}
              value={letter}
              onChange={(e) => handleInput(e, idx)}
            />
          ))}
        </div>

        <div className="absolute bottom-6 flex justify-center gap-2">
          <button className="px-4 py-2 cursor-pointer bg-primary text-white rounded" onClick={() => speakWord(currentWord.word, 'en-US')}>
            美式发音 🇺🇸
          </button>
          <button className="px-4 py-2 cursor-pointer bg-primary text-white rounded" onClick={() => speakWord(currentWord.word, 'en-GB')}>
            英式发音 🇬🇧
          </button>
          <button className="px-4 py-2 cursor-pointer bg-primary text-white rounded" onClick={handleSkipWord}>
            跳过单词 ⏭️
          </button>
          <button className="px-4 py-2 cursor-pointer bg-gray-500 text-white rounded" onClick={handleShowPhonetic}>
            查看音标 🔍
          </button>
          {
            showPhonetic && currentWord && (
              <div className=" p-2 bg-gray-100 rounded shadow">
                /{currentWord?.phoneticUK}/
              </div>
            )
          }
        </div>
      </div>

      <div className="fixed bottom-[70px] right-[50%] mr-[-75px] text-gray-700">
        ✅ {correctCount} / {totalWords}
      </div>
    </div>
  );
}
