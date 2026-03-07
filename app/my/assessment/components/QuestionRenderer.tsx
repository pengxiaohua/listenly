'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAssessmentStore } from '@/store/assessment';
import { CEFR_LEVELS } from '@/lib/vocabData';

import MCQuestion from './MCQuestion';
import Phase1Question from './Phase1Question';
import ProgressBar from './ProgressBar';

const COUNTDOWN_SECONDS = 8;

export default function QuestionRenderer() {
  const { state, answerPhase1, answerMC, answerDontKnow } = useAssessmentStore();
  const { currentQuestion, questionNumber, mode } = state;
  const isListening = mode === 'listening';

  const [timeLeft, setTimeLeft] = useState(COUNTDOWN_SECONDS);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const questionKeyRef = useRef<string>('');
  const questionTypeRef = useRef<string | undefined>(undefined);

  // Audio state for listening mode
  const [audioUrl, setAudioUrl] = useState<string>('');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // Fetch audio URL for listening mode
  const fetchAudioUrl = useCallback(async (word: string, levelIndex: number) => {
    const level = CEFR_LEVELS[levelIndex]?.toLowerCase();
    if (!level) return;
    try {
      const res = await fetch(`/api/vocab-assessment/audio-url?word=${encodeURIComponent(word)}&level=${level}`);
      const data = await res.json();
      if (data.url) {
        setAudioUrl(data.url);
        // Auto-play on load
        setTimeout(() => {
          if (audioRef.current) {
            audioRef.current.src = data.url;
            audioRef.current.play().catch(() => {});
          }
        }, 100);
      } else {
        setAudioUrl('');
      }
    } catch {
      setAudioUrl('');
    }
  }, []);

  const playAudio = useCallback(() => {
    if (audioRef.current && audioUrl) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
  }, [audioUrl]);

  // Reset and start countdown whenever the question changes
  useEffect(() => {
    if (!currentQuestion) return;

    const key = `${questionNumber}-${currentQuestion.word}`;
    if (questionKeyRef.current === key) return;
    questionKeyRef.current = key;
    questionTypeRef.current = currentQuestion.type;

    clearTimer();
    setTimeLeft(COUNTDOWN_SECONDS);

    // Fetch audio for listening mode
    if (isListening) {
      const levelIndex = currentQuestion.type === 'phase1'
        ? questionNumber - 1
        : state.currentLevelIndex;
      fetchAudioUrl(currentQuestion.word, levelIndex);
    }

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    return clearTimer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionNumber, currentQuestion?.word]);

  // Handle timeout
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
      {/* Hidden audio element for listening mode */}
      {isListening && <audio ref={audioRef} preload="auto" />}

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
          isListening={isListening}
          audioUrl={audioUrl}
          onPlayAudio={playAudio}
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
          isListening={isListening}
          audioUrl={audioUrl}
          onPlayAudio={playAudio}
          onAnswer={handleMCAnswer}
          onDontKnow={handleDontKnow}
        />
      )}
    </div>
  );
}
