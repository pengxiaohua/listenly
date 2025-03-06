// app/page.tsx
'use client';

import { useEffect, useState, useRef } from 'react';

interface Word {
  word: string;
  translation: string;
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
  const [isSlow, setIsSlow] = useState(false);
  const synthRef = useRef(window.speechSynthesis);

  useEffect(() => {
    fetch('/words/tagged_words_filtered.json')
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
    setTimeout(() => document.getElementById('letter-0')?.focus(), 100);
    speakWord(word.word, 'en-US');
  };

  const speakWord = (text: string, lang: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = isSlow ? 0.6 : 1;
    synthRef.current.speak(utterance);
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    if (!currentWord) return;
    const value = e.target.value.slice(-1);
    const newInputLetters = [...inputLetters];
    newInputLetters[index] = value;

    if (value.toLowerCase() !== currentWord.word[index].toLowerCase()) {
      setErrorIndexes(prev => [...prev, index]);
    } else {
      setErrorIndexes(prev => prev.filter(i => i !== index));
      const nextInput = document.getElementById(`letter-${index + 1}`);
      if (nextInput) nextInput.focus();
    }

    setInputLetters(newInputLetters);

    if (newInputLetters.join('').toLowerCase() === currentWord.word.toLowerCase()) {
      setCorrectCount(prev => prev + 1);
      setTimeout(() => pickRandomWord(currentWords), 500);
    }
  };

  const handleTagClick = (tag: string) => {
    setCurrentTag(tag);
    setCurrentWords(wordTags[tag]);
    setCorrectCount(0);
    pickRandomWord(wordTags[tag]);
  };

  if (!currentWord) return <div>Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto flex gap-4 mt-20">
      <div className="w-1/4 p-4 border rounded shadow">
        <h3 className="font-semibold mb-4">词库分类</h3>
        {tags.map(tag => (
          <button
            key={tag}
            className={`block w-full text-left p-2 rounded mb-2 ${tag === currentTag ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            onClick={() => handleTagClick(tag)}
          >
            {tag}
          </button>
        ))}
      </div>

      <div className="w-3/4 p-6 border rounded shadow relative">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">单词拼写练习</h2>
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isSlow}
              onChange={() => setIsSlow(!isSlow)}
              className="mr-2"
            />
          慢速
          </label>
        </div>
        <p className="mt-2 text-gray-600">{currentWord.translation}</p>

        <div className="flex gap-2 mt-4">
          {inputLetters.map((letter, idx) => (
            <input
              key={idx}
              id={`letter-${idx}`}
              className={`w-10 border-b-2 text-center text-xl focus:outline-none ${
                errorIndexes.includes(idx) ? 'border-red-500' : 'border-gray-400'
              }`}
              value={letter}
              onChange={(e) => handleInput(e, idx)}
            />
          ))}
        </div>

        <div className="mt-4 flex gap-2">
          <button className="px-4 py-2 bg-blue-500 text-white rounded" onClick={() => speakWord(currentWord.word, 'en-US')}>美式发音 🔈</button>
          <button className="px-4 py-2 bg-green-500 text-white rounded" onClick={() => speakWord(currentWord.word, 'en-GB')}>英式发音 🔈</button>
          <button className="px-4 py-2 bg-gray-500 text-white rounded" onClick={() => pickRandomWord(currentWords)}>跳过单词 ⏭️</button>
        </div>

        <div className="absolute top-4 right-4 text-gray-700">答对: {correctCount} / 总数: {currentWords.length}</div>
      </div>
    </div>
  );
}
