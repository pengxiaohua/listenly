'use client';

interface ProgressBarProps {
  questionNumber: number;
  totalQuestions?: number;
}

export default function ProgressBar({
  questionNumber,
  totalQuestions = 50,
}: ProgressBarProps) {
  const percentage = Math.min((questionNumber / totalQuestions) * 100, 100);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-slate-500 dark:text-slate-400">
          第 {questionNumber} 题
        </span>
        <span className="text-sm text-slate-400 dark:text-slate-500">
          {Math.round(percentage)}%
        </span>
      </div>
      <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-indigo-500 dark:bg-indigo-400 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
