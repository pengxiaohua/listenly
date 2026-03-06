'use client';

import { useAssessmentStore } from '@/store/assessment';

import MCQuestion from './MCQuestion';
import Phase1Question from './Phase1Question';
import ProgressBar from './ProgressBar';

export default function QuestionRenderer() {
  const { state, answerPhase1, answerMC, answerDontKnow } = useAssessmentStore();
  const { currentQuestion, questionNumber } = state;

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
          onAnswer={answerPhase1}
        />
      )}

      {currentQuestion?.type === 'mc' && (
        <MCQuestion
          word={currentQuestion.word}
          phonetic={currentQuestion.phonetic}
          options={currentQuestion.options}
          onAnswer={answerMC}
          onDontKnow={answerDontKnow}
        />
      )}
    </div>
  );
}
