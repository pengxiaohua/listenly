'use client';

import { useEffect, useRef, useState } from 'react';
import { useAssessmentStore } from '@/store/assessment';

import MCQuestion from './MCQuestion';
import Phase1Question from './Phase1Question';
import ProgressBar from './ProgressBar';

const COUNTDOWN_SECONDS = 8;

export default function QuestionRenderer() {
  const { state, answerPhase1, answerMC, answerDontKnow } = useAssessmentStore();
  const { currentQuestion, questionNumber } = state;

  const [timeLeft, setTimeLeft] = useState(COUNTDOWN_SECONDS);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const questionKeyRef = useRef<string>('');
  // keep a stable ref to the current question type to avoid stale closures
  const questionTypeRef = useRef<string | undefined>(undefined);

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // Reset and start countdown whenever the question changes
  useEffect(() => {
    if (!currentQuestion) return;

    const key = `${questionNumber}-${currentQuestion.word}`;
    if (questionKeyRef.current === key) return;
    questionKeyRef.current = key;
    questionTypeRef.current = currentQuestion.type;

    clearTimer();
    setTimeLeft(COUNTDOWN_SECONDS);

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    return clearTimer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionNumber, currentQuestion?.word]);

  // Handle timeout — runs after render, safe to call store actions here
  useEffect(() => {
    if (timeLeft !== 0) return;
    clearTimer();
    if (questionTypeRef.current === 'phase1') {
      answerPhase1(false);
    } else {
      answerDontKnow();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft]);

  const handlePhase1Answer = (knows: boolean) => {
    clearTimer();
    answerPhase1(knows);
  };

  const handleMCAnswer = (index: number) => {
    clearTimer();
    answerMC(index);
  };

  const handleDontKnow = () => {
    clearTimer();
    answerDontKnow();
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-lg mx-auto px-4">
      <ProgressBar questionNumber={questionNumber} />

      {currentQuestion === null && (
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-gray-400 dark:text-gray-500 text-lg">加载中…</p>
        </div>
      )}

      {currentQuestion?.type === 'phase1' && (
        <Phase1Question
          word={currentQuestion.word}
          phonetic={currentQuestion.phonetic}
          timeLeft={timeLeft}
          totalTime={COUNTDOWN_SECONDS}
          onAnswer={handlePhase1Answer}
        />
      )}

      {currentQuestion?.type === 'mc' && (
        <MCQuestion
          word={currentQuestion.word}
          phonetic={currentQuestion.phonetic}
          options={currentQuestion.options}
          timeLeft={timeLeft}
          totalTime={COUNTDOWN_SECONDS}
          onAnswer={handleMCAnswer}
          onDontKnow={handleDontKnow}
        />
      )}
    </div>
  );
}
