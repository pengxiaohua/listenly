'use client';

import CountdownRing from './CountdownRing';

interface MCQuestionProps {
  word: string;
  phonetic: string;
  options: string[];
  timeLeft: number;
  totalTime: number;
  onAnswer: (selectedIndex: number) => void;
  onDontKnow: () => void;
}

export default function MCQuestion({
  word,
  phonetic,
  options,
  timeLeft,
  totalTime,
  onAnswer,
  onDontKnow,
}: MCQuestionProps) {
  return (
    <div className="flex flex-col items-center justify-between min-h-[60vh] py-8">
      {/* Word display */}
      <div className="flex flex-col items-center gap-4">
        <CountdownRing timeLeft={timeLeft} totalTime={totalTime} />
        <span className="text-4xl font-bold text-gray-900 dark:text-gray-100">
          {word}
        </span>
        <span className="text-lg text-gray-400 dark:text-gray-500">
          {phonetic}
        </span>
      </div>

      {/* Options — mobile: 1 col, PC (≥768px): 2 col grid */}
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
        {/* "Don't know" — full width, matching the 2-col grid above */}
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
