import { create } from 'zustand';

import {
  createInitialState,
  generateQuestion,
  nextState,
} from '@/lib/assessmentEngine';
import type { AssessmentState } from '@/lib/assessmentEngine';
import { calculateScore } from '@/lib/scoringCalculator';
import type { ScoringResult } from '@/lib/scoringCalculator';

interface AssessmentStore {
  state: AssessmentState;
  scoringResult: ScoringResult | null;
  startAssessment: () => void;
  answerPhase1: (knows: boolean) => void;
  answerMC: (selectedIndex: number) => void;
  answerDontKnow: () => void;
  reset: () => void;
}

export const useAssessmentStore = create<AssessmentStore>((set, get) => ({
  state: createInitialState(),
  scoringResult: null,

  startAssessment: () => {
    const initial = createInitialState();
    const question = generateQuestion(initial);
    set({ state: { ...initial, currentQuestion: question }, scoringResult: null });
  },

  answerPhase1: (knows: boolean) => {
    const { state: current } = get();
    const updated = nextState(current, { type: 'phase1Answer', knows });

    if (updated.isComplete) {
      const scoringResult = buildScoringResult(updated);
      set({ state: updated, scoringResult });
      return;
    }

    const question = generateQuestion(updated);
    set({ state: { ...updated, currentQuestion: question } });
  },

  answerMC: (selectedIndex: number) => {
    const { state: current } = get();
    const updated = nextState(current, { type: 'mcAnswer', selectedIndex });

    if (updated.isComplete) {
      const scoringResult = buildScoringResult(updated);
      set({ state: updated, scoringResult });
      return;
    }

    const question = generateQuestion(updated);
    set({ state: { ...updated, currentQuestion: question } });
  },

  answerDontKnow: () => {
    const { state: current } = get();
    const updated = nextState(current, { type: 'mcDontKnow' });

    if (updated.isComplete) {
      const scoringResult = buildScoringResult(updated);
      set({ state: updated, scoringResult });
      return;
    }

    const question = generateQuestion(updated);
    set({ state: { ...updated, currentQuestion: question } });
  },

  reset: () => {
    set({ state: createInitialState(), scoringResult: null });
  },
}));

/** Extract Phase 2 answers and calculate the final score. */
function buildScoringResult(state: AssessmentState): ScoringResult {
  // Phase 2 answers: all answers after Phase 1 (questionNumber > 6 or phase === 2)
  const phase1LastQ = state.answers.filter(a => a.questionNumber <= 6).length;
  const phase2Answers = state.answers.slice(phase1LastQ);

  return calculateScore({
    anchorLevelIndex: state.currentLevelIndex,
    phase2Answers,
    exitReason: state.exitReason ?? 'questions_done',
  });
}
