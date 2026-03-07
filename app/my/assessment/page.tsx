'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import AuthGuard from '@/components/auth/AuthGuard';
import { useAssessmentStore } from '@/store/assessment';
import type { AssessmentMode } from '@/lib/assessmentEngine';

import QuestionRenderer from './components/QuestionRenderer';
import ResultDisplay from './components/ResultDisplay';

export default function AssessmentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = (searchParams.get('mode') as AssessmentMode) || 'reading';
  const { state, scoringResult, startAssessment, reset } = useAssessmentStore();

  useEffect(() => {
    startAssessment(mode);
    return () => {
      reset();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleBackToLanding = () => {
    router.push('/my?tab=assessment');
  };

  return (
    <AuthGuard>
      <div className="container mx-auto p-4 md:px-0 md:pb-0">
        {state.isComplete && scoringResult ? (
          <ResultDisplay
            scoringResult={scoringResult}
            mode={state.mode}
            onRestart={() => startAssessment(state.mode)}
            onBackToLanding={handleBackToLanding}
          />
        ) : (
          <QuestionRenderer />
        )}
      </div>
    </AuthGuard>
  );
}
