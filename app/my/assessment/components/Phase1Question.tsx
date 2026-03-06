'use client';

import CountdownRing from './CountdownRing';

interface Phase1QuestionProps {
  word: string;
  phonetic: string;
  timeLeft: number;
  totalTime: number;
  onAnswer: (knows: boolean) => void;
}

export default function Phase1Question({
  word,
  phonetic,
  timeLeft,
  totalTime,
  onAnswer,
}: Phase1QuestionProps) {
  return (
    <div className="flex flex-col items-center justify-between min-h-[60vh] py-8">
      {/* Hint text */}
      <p className="text-sm text-gray-400 dark:text-gray-500">
        凭直觉判断，不要猜测
      </p>

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

      {/* Action buttons */}
      <div className="flex gap-6 w-full max-w-sm">
        <button
          type="button"
          onClick={() => onAnswer(false)}
          className="flex-1 py-4 rounded-xl text-lg font-medium bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-red-900/30 dark:hover:text-red-400 transition-colors cursor-pointer"
        >
          不认识
        </button>
        <button
          type="button"
          onClick={() => onAnswer(true)}
          className="flex-1 py-4 rounded-xl text-lg font-medium bg-green-500 text-white hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700 transition-colors cursor-pointer"
        >
          认识
        </button>
      </div>
    </div>
  );
}
