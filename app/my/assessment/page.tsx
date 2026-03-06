'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import AuthGuard from '@/components/auth/AuthGuard';
import { useAssessmentStore } from '@/store/assessment';

import QuestionRenderer from './components/QuestionRenderer';
import ResultDisplay from './components/ResultDisplay';

export default function AssessmentPage() {
  const router = useRouter();
  const { state, scoringResult, startAssessment, reset } = useAssessmentStore();

  useEffect(() => {
    startAssessment();
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
            onRestart={startAssessment}
            onBackToLanding={handleBackToLanding}
          />
        ) : (
          <QuestionRenderer />
        )}
      </div>
    </AuthGuard>
  );
}
