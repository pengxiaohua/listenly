// Scoring Calculator — 全局权重统计算法
// 根据 Anchor Level 动态计算 R1（本级正确率）和 R2（越级正确率）

import type { AnswerRecord, ExitReason } from '@/lib/assessmentEngine';
import type { CEFRLevel } from '@/lib/vocabData';
import { CEFR_LEVELS } from '@/lib/vocabData';

/** 等级配置：基数和跨度 */
export interface LevelConfig {
  base: number;
  span: number;
}

/** 六个 CEFR 等级对应的词汇量基数和跨度 */
export const LEVEL_CONFIGS: LevelConfig[] = [
  { base: 0,     span: 1500 }, // A1: 0–1,500
  { base: 1500,  span: 1500 }, // A2: 1,500–3,000
  { base: 3000,  span: 2000 }, // B1: 3,000–5,000
  { base: 5000,  span: 3000 }, // B2: 5,000–8,000
  { base: 8000,  span: 4000 }, // C1: 8,000–12,000
  { base: 12000, span: 6000 }, // C2: 12,000–18,000
];

/**
 * 根据最终词汇量反向匹配 CEFR 等级。
 */
export function getFinalCEFRLevel(vocabSize: number): CEFRLevel {
  if (vocabSize < 1500) return 'A1';
  if (vocabSize < 3000) return 'A2';
  if (vocabSize < 5000) return 'B1';
  if (vocabSize < 8000) return 'B2';
  if (vocabSize < 12000) return 'C1';
  return 'C2';
}

/** 评分输入 */
export interface ScoringInput {
  anchorLevelIndex: number;
  phase2Answers: AnswerRecord[];
  exitReason: ExitReason;
}

/** 评分结果 */
export interface ScoringResult {
  finalVocab: number;
  cefrLevel: CEFRLevel;
  /** 本级正确率 (R1) */
  anchorCorrectRate: number;
  /** 越级正确率 (R2) */
  aboveCorrectRate: number;
  rawVocab: number;
}

/**
 * 计算最终词汇量估算值（全局权重统计算法）。
 *
 * 1. 锁定 Anchor Level（触底熔断时强制 A1）
 * 2. R1 = Anchor Level 的正确率，R2 = Anchor Level + 1 的正确率
 * 3. 降级保护：R1 < 0.4 且非 A1 时强制降级
 * 4. rawVocab = base + R1 * span * 0.70 + R2 * span * 0.30
 * 5. 平滑处理
 */
export function calculateScore(
  input: ScoringInput,
  randomFn: () => number = Math.random,
): ScoringResult {
  const { anchorLevelIndex, phase2Answers, exitReason } = input;

  // 触底熔断 → 强制 A1
  let effectiveAnchor = exitReason === 'floor_breaker' ? 0 : anchorLevelIndex;

  // 计算 R1（本级正确率）和 R2（越级正确率）
  const anchorLevel = CEFR_LEVELS[effectiveAnchor];
  const aboveLevel = effectiveAnchor < 5 ? CEFR_LEVELS[effectiveAnchor + 1] : null;

  const anchorAnswers = phase2Answers.filter(a => a.cefrLevel === anchorLevel);
  const aboveAnswers = aboveLevel
    ? phase2Answers.filter(a => a.cefrLevel === aboveLevel)
    : [];

  const r1 = anchorAnswers.length > 0
    ? anchorAnswers.filter(a => a.isCorrect).length / anchorAnswers.length
    : 0;
  const r2 = aboveAnswers.length > 0
    ? aboveAnswers.filter(a => a.isCorrect).length / aboveAnswers.length
    : 0;

  // 降级保护：本级正确率不足 40% 且非 A1
  if (r1 < 0.4 && effectiveAnchor > 0) {
    effectiveAnchor -= 1;

    // 降级后重新计算 R1 和 R2
    const newAnchorLevel = CEFR_LEVELS[effectiveAnchor];
    const newAboveLevel = CEFR_LEVELS[effectiveAnchor + 1];

    const newAnchorAnswers = phase2Answers.filter(a => a.cefrLevel === newAnchorLevel);
    const newAboveAnswers = phase2Answers.filter(a => a.cefrLevel === newAboveLevel);

    const newR1 = newAnchorAnswers.length > 0
      ? newAnchorAnswers.filter(a => a.isCorrect).length / newAnchorAnswers.length
      : 0;
    const newR2 = newAboveAnswers.length > 0
      ? newAboveAnswers.filter(a => a.isCorrect).length / newAboveAnswers.length
      : 0;

    return buildResult(effectiveAnchor, newR1, newR2, randomFn);
  }

  return buildResult(effectiveAnchor, r1, r2, randomFn);
}

function buildResult(
  anchorIndex: number,
  r1: number,
  r2: number,
  randomFn: () => number,
): ScoringResult {
  const config = LEVEL_CONFIGS[anchorIndex];

  // R1 占 70% 核心权重，R2 占 30% 越级奖励
  const rawVocab = config.base + r1 * config.span * 0.70 + r2 * config.span * 0.30;

  const base10Vocab = Math.round(rawVocab / 10) * 10;
  const finalVocab = base10Vocab + Math.floor(randomFn() * 10);

  const cefrLevel = getFinalCEFRLevel(finalVocab);

  return {
    finalVocab,
    cefrLevel,
    anchorCorrectRate: r1,
    aboveCorrectRate: r2,
    rawVocab,
  };
}
