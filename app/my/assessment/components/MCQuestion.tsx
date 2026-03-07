'use client';

import { Volume2, RotateCcw } from 'lucide-react';
import CountdownRing from './CountdownRing';

interface MCQuestionProps {
  word: string;
  phonetic: string;
  options: string[];
  timeLeft: number;
  totalTime: number;
  isListening?: boolean;
  audioUrl?: string;
  onPlayAudio?: () => void;
  onAnswer: (selectedIndex: number) => void;
  onDontKnow: () => void;
}

export default function MCQuestion({
  word,
  phonetic,
  options,
  timeLeft,
  totalTime,
  isListening,
  audioUrl,
  onPlayAudio,
  onAnswer,
  onDontKnow,
}: MCQuestionProps) {
  return (
    <div className="flex flex-col items-center justify-between min-h-[60vh] py-8">
      <div className="flex flex-col items-center gap-4">
        <CountdownRing timeLeft={timeLeft} totalTime={totalTime} />

        {isListening ? (
          <button
            type="button"
            onClick={onPlayAudio}
            disabled={!audioUrl}
            className="flex items-center gap-2 px-6 py-4 rounded-2xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 transition-colors cursor-pointer"
          >
            <Volume2 className="w-10 h-10 text-blue-500" />
            <RotateCcw className="w-4 h-4 text-gray-400" />
          </button>
        ) : (
          <>
            <span className="text-4xl font-bold text-gray-900 dark:text-gray-100">
              {word}
            </span>
            <span className="text-lg text-gray-400 dark:text-gray-500">
              {phonetic}
            </span>
          </>
        )}
      </div>

      <div className="w-full max-w-sm md:max-w-lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          {options.map((option, index) => (
            <button
              key={index}
              type="button"
              onClick={() => onAnswer(index)}
              className="w-full py-4 px-6 rounded-xl text-lg font-medium text-left bg-gray-100 text-gray-700 hover:bg-blue-50 hover:text-blue-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-blue-900/30 dark:hover:text-blue-400 transition-colors cursor-pointer"
            >
              {option}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onDontKnow}
          className="w-full py-4 px-6 rounded-xl text-lg font-medium text-center bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:bg-gray-800/50 dark:text-gray-500 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors border border-dashed border-gray-200 dark:border-gray-700 cursor-pointer"
        >
          不认识 / 记不清
        </button>
      </div>
    </div>
  );
}
