'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Volume2, RotateCcw, Check, X } from 'lucide-react';
import CountdownRing from './CountdownRing';

interface MCQuestionProps {
  word: string;
  phonetic: string;
  options: string[];
  correctIndex: number;
  timeLeft: number;
  totalTime: number;
  isListening?: boolean;
  audioUrl?: string;
  showCorrectFeedback?: boolean;
  onPlayAudio?: () => void;
  onAnswer: (selectedIndex: number) => void;
  onDontKnow: () => void;
}

const FEEDBACK_DELAY = 500;

export default function MCQuestion({
  word,
  phonetic,
  options,
  correctIndex,
  timeLeft,
  totalTime,
  isListening,
  audioUrl,
  showCorrectFeedback,
  onPlayAudio,
  onAnswer,
  onDontKnow,
}: MCQuestionProps) {
  // 'idle' = no feedback, 'selected' = user picked an option, 'dontknow' = don't know / timeout
  const [feedback, setFeedback] = useState<
    { type: 'idle' } | { type: 'selected'; index: number } | { type: 'dontknow' }
  >({ type: 'idle' });
  const lockRef = useRef(false);

  // When showCorrectFeedback flips to true (timeout), show correct answer then advance
  useEffect(() => {
    if (!showCorrectFeedback || lockRef.current) return;
    lockRef.current = true;
    setFeedback({ type: 'dontknow' });
    setTimeout(() => onDontKnow(), FEEDBACK_DELAY);
  }, [showCorrectFeedback, onDontKnow]);

  const handleSelect = useCallback((index: number) => {
    if (lockRef.current) return;
    lockRef.current = true;
    setFeedback({ type: 'selected', index });
    setTimeout(() => onAnswer(index), FEEDBACK_DELAY);
  }, [onAnswer]);

  const handleDontKnow = useCallback(() => {
    if (lockRef.current) return;
    lockRef.current = true;
    setFeedback({ type: 'dontknow' });
    setTimeout(() => onDontKnow(), FEEDBACK_DELAY);
  }, [onDontKnow]);

  const hasFeedback = feedback.type !== 'idle';

  const getOptionStyle = (index: number) => {
    if (!hasFeedback) {
      return 'bg-slate-100 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-indigo-900/30 dark:hover:text-indigo-400 cursor-pointer';
    }
    // Always highlight correct answer green
    if (index === correctIndex) {
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300';
    }
    // Highlight wrong selection red
    if (feedback.type === 'selected' && index === feedback.index && feedback.index !== correctIndex) {
      return 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300';
    }
    return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
  };

  const getFeedbackIcon = (index: number) => {
    if (!hasFeedback) return null;
    if (index === correctIndex) {
      return <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />;
    }
    if (feedback.type === 'selected' && index === feedback.index && feedback.index !== correctIndex) {
      return <X className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />;
    }
    return null;
  };

  return (
    <div className="flex flex-col items-center justify-between min-h-[60vh] py-8">
      <div className="flex flex-col items-center gap-4">
        <CountdownRing timeLeft={timeLeft} totalTime={totalTime} />

        {isListening ? (
          <button
            type="button"
            onClick={onPlayAudio}
            disabled={!audioUrl}
            className="flex items-center gap-2 px-6 py-4 rounded-2xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/40 transition-colors cursor-pointer"
          >
            <Volume2 className="w-10 h-10 text-indigo-500" />
            <RotateCcw className="w-4 h-4 text-slate-400" />
          </button>
        ) : (
          <>
            <span className="text-4xl font-bold text-slate-900 dark:text-slate-100">
              {word}
            </span>
            <span className="text-lg text-slate-400 dark:text-slate-500">
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
              onClick={() => handleSelect(index)}
              disabled={hasFeedback}
              className={`w-full py-4 px-6 rounded-xl text-lg font-medium text-left flex items-center justify-between gap-2 transition-colors ${getOptionStyle(index)}`}
            >
              <span>{option}</span>
              {getFeedbackIcon(index)}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={handleDontKnow}
          disabled={hasFeedback}
          className="w-full py-4 px-6 rounded-xl text-lg font-medium text-center bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-500 dark:bg-slate-800/50 dark:text-slate-500 dark:hover:bg-rose-900/20 dark:hover:text-rose-400 transition-colors border border-dashed border-slate-200 dark:border-slate-700 cursor-pointer"
        >
          不认识 / 记不清
        </button>
      </div>
    </div>
  );
}
