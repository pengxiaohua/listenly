'use client';

import { REVIEW_TAG, VOCAB_REVIEW_TAG } from '../lib/constants';
import type { WordGroupSummary } from '../lib/types';

interface CompletedViewProps {
  tag: string;
  setSlug: string;
  groupOrderParam: string | null;
  wordGroups: WordGroupSummary[];
  onBack: () => void;
  onRestart: () => void;
  onBackToTagList: () => void;
  onNextGroup: (nextOrder: number) => void;
  /**
   * 当 true 时展示复习模式相关文案/按钮；为 false 时始终展示「返回/重新开始/下一组」
   * 用于区分 `isCorpusCompleted` 与 `!currentWord` 两种触发路径。
   */
  allowReviewBranch?: boolean;
}

export default function CompletedView({
  tag,
  setSlug,
  groupOrderParam,
  wordGroups,
  onBack,
  onRestart,
  onBackToTagList,
  onNextGroup,
  allowReviewBranch = true,
}: CompletedViewProps) {
  const isReview = tag === REVIEW_TAG;
  const isVocabReview = tag === VOCAB_REVIEW_TAG;
  const isReviewMode = allowReviewBranch && (isReview || isVocabReview);

  const title = isReviewMode
    ? isVocabReview
      ? '恭喜！你已经复习完所有生词本的单词'
      : '恭喜！你已经复习完所有错误的单词'
    : '恭喜！你已完成这一组所有单词！';

  const currentOrder = groupOrderParam ? parseInt(groupOrderParam) : NaN;
  const maxOrder = wordGroups.reduce((m, g) => Math.max(m, g.order), 0);
  const hasNext = Number.isFinite(currentOrder) && currentOrder < maxOrder;

  return (
    <div className="text-xl md:text-2xl font-bold text-emerald-600 flex flex-col items-center gap-6">
      <div>{title}</div>

      {!isReviewMode && (
        <div className="flex gap-4 text-sm md:text-base">
          <button
            onClick={onBack}
            className="px-3 md:px-6 py-1.5 md:py-2 bg-slate-200 hover:bg-slate-300 rounded-lg text-slate-700 font-medium transition-colors cursor-pointer"
          >
            返回
          </button>
          <button
            onClick={onRestart}
            className="px-3 md:px-6 py-1.5 md:py-2 bg-indigo-500 hover:bg-indigo-600 rounded-lg text-white font-medium transition-colors cursor-pointer"
          >
            重新开始
          </button>
          {hasNext && setSlug && (
            <button
              onClick={() => onNextGroup(currentOrder + 1)}
              className="px-3 md:px-6 py-1.5 md:py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-white font-medium transition-colors cursor-pointer"
            >
              下一组
            </button>
          )}
        </div>
      )}

      {isReviewMode && (
        <div className="flex gap-4">
          <button
            onClick={onBackToTagList}
            className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-base rounded-lg text-white font-medium transition-colors cursor-pointer"
          >
            返回所有课程
          </button>
        </div>
      )}
    </div>
  );
}
