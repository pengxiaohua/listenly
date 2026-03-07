// Assessment Engine — 高弹性自适应词汇测评状态机
// Phase 1: 动态破冰（1~6题，随时截断）
// Phase 2: 拉锯与提前交卷（动态题量，最少15题，最多44题）

import { getRandomWord, CEFR_LEVELS } from '@/lib/vocabData';
import type { CEFRLevel } from '@/lib/vocabData';

/** 答题记录 */
export interface AnswerRecord {
  questionNumber: number;
  word: string;
  selectedAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  cefrLevel: CEFRLevel;
  /** 用户是否选择了"不认识" */
  isDontKnow: boolean;
}

/** 测评结束原因 */
export type ExitReason =
  | 'floor_breaker'    // 触底熔断
  | 'stable_converge'  // 平稳收网
  | 'questions_done';  // 题量耗尽

/** 测评模式 */
export type AssessmentMode = 'reading' | 'listening';

/** 测评状态 */
export interface AssessmentState {
  mode: AssessmentMode;
  phase: 1 | 2;
  questionNumber: number;
  currentLevelIndex: number; // 0-5
  answers: AnswerRecord[];
  usedWords: Set<string>;
  currentQuestion: Question | null;
  isComplete: boolean;
  lastKnownLevel: number; // Phase 1 中最后一个"认识"的等级索引，默认 -1
  /** Phase 2 连续失败计数（选错或不认识） */
  consecutiveFailures: number;
  /** Phase 2 最近 N 题的等级历史，用于平稳收网判断 */
  recentLevels: number[];
  /** 测评结束原因 */
  exitReason: ExitReason | null;
}

/** Phase 1 题目：认识/不认识 */
export interface Phase1Question {
  type: 'phase1';
  word: string;
  phonetic: string;
  cefrLevel: CEFRLevel;
}

/** 选择题（4个释义 + 1个"不认识"） */
export interface MCQuestion {
  type: 'mc';
  word: string;
  phonetic: string;
  cefrLevel: CEFRLevel;
  options: string[]; // 4 个中文释义选项
  correctIndex: number;
}

/** 题目联合类型 */
export type Question = Phase1Question | MCQuestion;

/** 用户动作 */
export type UserAction =
  | { type: 'phase1Answer'; knows: boolean }
  | { type: 'mcAnswer'; selectedIndex: number }
  | { type: 'mcDontKnow' };

/** 最大题量上限 */
const MAX_QUESTIONS = 50;
/** Phase 2 最少题量（在此之前不触发平稳收网） */
const MIN_PHASE2_QUESTIONS = 20;
/** 平稳收网：最近 N 题等级无变化 */
const STABLE_WINDOW = 6;
/** 触底熔断：A1 连续失败次数 */
const FLOOR_BREAK_STREAK = 3;

/**
 * 创建初始测评状态。
 */
export function createInitialState(mode: AssessmentMode = 'reading'): AssessmentState {
  return {
    mode,
    phase: 1,
    questionNumber: 1,
    currentLevelIndex: 0,
    answers: [],
    usedWords: new Set<string>(),
    currentQuestion: null,
    isComplete: false,
    lastKnownLevel: -1,
    consecutiveFailures: 0,
    recentLevels: [],
    exitReason: null,
  };
}

/**
 * 根据当前状态生成下一道题目。
 */
export function generateQuestion(state: AssessmentState): Question | null {
  if (state.phase === 1) {
    const levelIndex = state.questionNumber - 1;
    const entry = getRandomWord(levelIndex, state.usedWords);
    if (!entry) return null;

    state.usedWords.add(entry.word);

    return {
      type: 'phase1',
      word: entry.word,
      phonetic: entry.phonetic,
      cefrLevel: CEFR_LEVELS[levelIndex],
    };
  }

  // Phase 2: 四选一 + "不认识"
  const entry = getRandomWord(state.currentLevelIndex, state.usedWords);
  if (!entry) return null;

  state.usedWords.add(entry.word);

  const options = [entry.definition, ...entry.distractors];
  shuffleArray(options);
  const correctIndex = options.indexOf(entry.definition);

  return {
    type: 'mc',
    word: entry.word,
    phonetic: entry.phonetic,
    cefrLevel: CEFR_LEVELS[state.currentLevelIndex],
    options,
    correctIndex,
  };
}

/** Fisher-Yates 洗牌 */
function shuffleArray<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

/**
 * 核心状态转换函数。
 */
export function nextState(state: AssessmentState, action: UserAction): AssessmentState {
  if (state.phase === 1 && action.type === 'phase1Answer') {
    return handlePhase1(state, action.knows);
  }

  if (state.phase === 2 && (action.type === 'mcAnswer' || action.type === 'mcDontKnow')) {
    return handlePhase2(state, action);
  }

  return state;
}

/** Phase 1 状态转换 — 动态破冰，随时截断 */
function handlePhase1(state: AssessmentState, knows: boolean): AssessmentState {
  const currentLevelIndex = state.questionNumber - 1;
  const word = state.currentQuestion?.word ?? '';
  const cefrLevel = CEFR_LEVELS[currentLevelIndex];

  const answerRecord: AnswerRecord = {
    questionNumber: state.questionNumber,
    word,
    selectedAnswer: knows ? '认识' : '不认识',
    correctAnswer: word,
    isCorrect: knows,
    cefrLevel,
    isDontKnow: !knows,
  };

  const newAnswers = [...state.answers, answerRecord];
  const newUsedWords = new Set(state.usedWords);

  if (knows) {
    const newLastKnownLevel = currentLevelIndex;

    if (state.questionNumber < 6) {
      // 还有下一个等级要问
      return {
        ...state,
        questionNumber: state.questionNumber + 1,
        answers: newAnswers,
        usedWords: newUsedWords,
        currentQuestion: null,
        lastKnownLevel: newLastKnownLevel,
      };
    }

    // 全部 6 题都认识 → 进入 Phase 2，起点 C2
    return {
      ...state,
      phase: 2,
      questionNumber: 7,
      currentLevelIndex: 5,
      answers: newAnswers,
      usedWords: newUsedWords,
      currentQuestion: null,
      lastKnownLevel: newLastKnownLevel,
      consecutiveFailures: 0,
      recentLevels: [],
    };
  }

  // 不认识 → 立即截断，进入 Phase 2
  const targetLevel = state.lastKnownLevel >= 0 ? state.lastKnownLevel : 0;

  return {
    ...state,
    phase: 2,
    questionNumber: state.questionNumber + 1,
    currentLevelIndex: targetLevel,
    answers: newAnswers,
    usedWords: newUsedWords,
    currentQuestion: null,
    consecutiveFailures: 0,
    recentLevels: [],
  };
}

/** Phase 2 状态转换 — 拉锯 + 提前交卷 */
function handlePhase2(state: AssessmentState, action: { type: 'mcAnswer'; selectedIndex: number } | { type: 'mcDontKnow' }): AssessmentState {
  const question = state.currentQuestion;
  if (!question || question.type !== 'mc') return state;

  const isDontKnow = action.type === 'mcDontKnow';
  const isCorrect = !isDontKnow && action.type === 'mcAnswer' && action.selectedIndex === question.correctIndex;
  const cefrLevel = CEFR_LEVELS[state.currentLevelIndex];

  const answerRecord: AnswerRecord = {
    questionNumber: state.questionNumber,
    word: question.word,
    selectedAnswer: isDontKnow ? '不认识' : question.options[action.type === 'mcAnswer' ? action.selectedIndex : 0],
    correctAnswer: question.options[question.correctIndex],
    isCorrect,
    cefrLevel,
    isDontKnow,
  };

  const newAnswers = [...state.answers, answerRecord];
  const newUsedWords = new Set(state.usedWords);

  // 计算新等级
  const newLevelIndex = isCorrect
    ? Math.min(state.currentLevelIndex + 1, 5)
    : Math.max(state.currentLevelIndex - 1, 0);

  // 更新连续失败计数
  const newConsecutiveFailures = (!isCorrect && newLevelIndex === 0)
    ? state.consecutiveFailures + 1
    : (isCorrect ? 0 : state.consecutiveFailures);

  // 更新最近等级历史
  const newRecentLevels = [...state.recentLevels, newLevelIndex];

  // Phase 2 已做题数 = recentLevels 长度（每次 Phase 2 答题都会 push）
  const phase2QuestionCount = newRecentLevels.length;

  // === 提前终止检查 ===

  // 1. 触底熔断：A1 且连续 3 题失败
  if (newLevelIndex === 0 && newConsecutiveFailures >= FLOOR_BREAK_STREAK) {
    return {
      ...state,
      phase: 2,
      questionNumber: state.questionNumber,
      currentLevelIndex: 0, // 强制 A1
      answers: newAnswers,
      usedWords: newUsedWords,
      currentQuestion: null,
      isComplete: true,
      consecutiveFailures: newConsecutiveFailures,
      recentLevels: newRecentLevels,
      exitReason: 'floor_breaker',
    };
  }

  // 2. 平稳收网：Phase 2 做满 20 题后，最近 6 题等级无变化
  if (phase2QuestionCount >= MIN_PHASE2_QUESTIONS && newRecentLevels.length >= STABLE_WINDOW) {
    const lastN = newRecentLevels.slice(-STABLE_WINDOW);
    const allSame = lastN.every(l => l === lastN[0]);
    if (allSame) {
      return {
        ...state,
        phase: 2,
        questionNumber: state.questionNumber,
        currentLevelIndex: newLevelIndex,
        answers: newAnswers,
        usedWords: newUsedWords,
        currentQuestion: null,
        isComplete: true,
        consecutiveFailures: newConsecutiveFailures,
        recentLevels: newRecentLevels,
        exitReason: 'stable_converge',
      };
    }
  }

  // 3. 题量耗尽
  if (state.questionNumber >= MAX_QUESTIONS) {
    return {
      ...state,
      phase: 2,
      questionNumber: state.questionNumber,
      currentLevelIndex: newLevelIndex,
      answers: newAnswers,
      usedWords: newUsedWords,
      currentQuestion: null,
      isComplete: true,
      consecutiveFailures: newConsecutiveFailures,
      recentLevels: newRecentLevels,
      exitReason: 'questions_done',
    };
  }

  // 继续 Phase 2
  return {
    ...state,
    phase: 2,
    questionNumber: state.questionNumber + 1,
    currentLevelIndex: newLevelIndex,
    answers: newAnswers,
    usedWords: newUsedWords,
    currentQuestion: null,
    consecutiveFailures: newConsecutiveFailures,
    recentLevels: newRecentLevels,
  };
}
