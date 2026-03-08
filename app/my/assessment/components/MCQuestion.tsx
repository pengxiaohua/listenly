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
      return 'bg-gray-100 text-gray-700 hover:bg-blue-50 hover:text-blue-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-blue-900/30 dark:hover:text-blue-400 cursor-pointer';
    }
    // Always highlight correct answer green
    if (index === correctIndex) {
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
    }
    // Highlight wrong selection red
    if (feedback.type === 'selected' && index === feedback.index && feedback.index !== correctIndex) {
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
    }
    return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
  };

  const getFeedbackIcon = (index: number) => {
    if (!hasFeedback) return null;
    if (index === correctIndex) {
      return <Check className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0" />;
    }
    if (feedback.type === 'selected' && index === feedback.index && feedback.index !== correctIndex) {
      return <X className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />;
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
          className="w-full py-4 px-6 rounded-xl text-lg font-medium text-center bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:bg-gray-800/50 dark:text-gray-500 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors border border-dashed border-gray-200 dark:border-gray-700 cursor-pointer"
        >
          不认识 / 记不清
        </button>
      </div>
    </div>
  );
}
