
'use client';

import { useEffect, useState, useRef } from 'react';

import { getWordsJson } from '../constants';

interface Word {
  word: string;
  translation: string;
  phonetic: string;
  defination: string;
}

export default function Home() {
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
  const synthRef = useRef(typeof window !== 'undefined' ? window.speechSynthesis : null);

  useEffect(() => {
    fetch(getWordsJson)
      .then(res => res.json())
      .then((data: { [tag: string]: Word[] }) => {
        setWordTags(data);
        const tagKeys = Object.keys(data);
        setTags(tagKeys);
        if (tagKeys.length > 0) {
          setCurrentTag(tagKeys[0]);
          setCurrentWords(data[tagKeys[0]]);
          pickRandomWord(data[tagKeys[0]]);
        }
      });
  }, []);

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
    synthRef.current.speak(utterance);
  };

  // 播放音效
  const playSound = (src: string) => {
    const audio = new Audio(src);
    audio.play();
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    if (!currentWord) return;
    const value = e.target.value.slice(-1);
    const newInputLetters = [...inputLetters];
    newInputLetters[index] = value;

    if (value.toLowerCase() !== currentWord.word[index].toLowerCase()) {
      setErrorIndexes(prev => [...prev, index]);
      playSound('/sounds/wrong.mp3');  // 播放错误音效
    } else {
      setErrorIndexes(prev => prev.filter(i => i !== index));
      const nextInput = document.getElementById(`letter-${index + 1}`);
      if (nextInput) nextInput.focus();
    }

    setInputLetters(newInputLetters);

    if (newInputLetters.join('').toLowerCase() === currentWord.word.toLowerCase()) {
      setCorrectCount(prev => prev + 1);
      // 单词正确时播放音效
      playSound('/sounds/correct.mp3');
      setTimeout(() => pickRandomWord(currentWords), 500);
    }
  };

  const handleTagClick = (tag: string) => {
    setCurrentTag(tag);
    setCurrentWords(wordTags[tag]);
    setCorrectCount(0);
    pickRandomWord(wordTags[tag]);
  };

  const handleShowPhonetic = () => {
    setShowPhonetic(true);
    setTimeout(() => setShowPhonetic(false), 3000);
  };

  if (!currentWord) return <div>Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto flex gap-4 mt-20">
      <div className="w-1/6 p-4 border rounded shadow">
        <h3 className="font-semibold mb-4 text-center">词库分类</h3>
        {tags.map(tag => (
          <button
            key={tag}
            className={`block w-full text-left p-2 cursor-pointer rounded mb-2 ${tag === currentTag ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            onClick={() => handleTagClick(tag)}
          >
            {tag}
          </button>
        ))}
      </div>

      <div className="w-5/6 p-6 border rounded shadow relative">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">单词拼写练习</h2>
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isSlow}
              onChange={() => setIsSlow(!isSlow)}
              className="mr-2"
            />
            🐢慢速
          </label>
        </div>
        <div className="mt-2 text-gray-600 whitespace-pre-line">
          {currentWord.translation.replace(/\\n/g, '\n')}
        </div>

        <div className="flex gap-2 mt-4">
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

        <div className="mt-4 flex gap-2">
          <button className="px-4 py-2 cursor-pointer bg-blue-500 text-white rounded" onClick={() => speakWord(currentWord.word, 'en-US')}>
            美式发音 🇺🇸
          </button>
          <button className="px-4 py-2 cursor-pointer bg-green-500 text-white rounded" onClick={() => speakWord(currentWord.word, 'en-GB')}>
            英式发音 🇬🇧
          </button>
          <button className="px-4 py-2 cursor-pointer bg-gray-500 text-white rounded" onClick={() => pickRandomWord(currentWords)}>
            跳过单词 ⏭️
          </button>
          <button className="px-4 py-2 cursor-pointer bg-yellow-500 text-white rounded" onClick={handleShowPhonetic}>
            查看音标 🔍
          </button>
          {
            showPhonetic && currentWord && (
              <div className=" p-2 bg-gray-100 rounded shadow">
                /{currentWord?.phonetic}/
              </div>
            )
          }
        </div>
      </div>

      <div className="absolute top-4 right-4 text-gray-700">
        答对: {correctCount} / 总数:{currentWords.length}
      </div>
    </div>
  );
}
