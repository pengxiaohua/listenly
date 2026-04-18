'use client';

import type { MouseEvent, PointerEvent } from 'react';

interface MobileActionBarProps {
  showAnswer: boolean;
  isInVocabulary: boolean;
  checkingVocabulary: boolean;
  isAddingToVocabulary: boolean;
  onPlay: () => void;
  onValidate: () => void;
  onToggleAnswer: () => void;
  onAddVocab: () => void;
}

/**
 * 移动端底部操作栏。
 *
 * 关键点：所有按钮通过 onPointerDown/onMouseDown preventDefault 阻止默认的
 * 焦点转移，这样点击按钮时当前输入框不会 blur，从而：
 * 1. 保持软键盘开启（移动端）
 * 2. 避免 iOS/Android 上软键盘反复收起打开
 *
 * "校验"按钮直接调用 onValidate，不再通过模拟 KeyboardEvent 走原有的 keydown 回调，
 * 彻底修复 document.activeElement 不再是 INPUT 时的失效 bug。
 */
export default function MobileActionBar({
  showAnswer,
  isInVocabulary,
  checkingVocabulary,
  isAddingToVocabulary,
  onPlay,
  onValidate,
  onToggleAnswer,
  onAddVocab,
}: MobileActionBarProps) {
  const preventFocusLoss = (e: MouseEvent | PointerEvent) => {
    e.preventDefault();
  };

  const btnBase =
    'px-3 py-1.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-xs text-slate-700 dark:text-slate-300 active:bg-slate-200 dark:active:bg-slate-600';

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-slate-100 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 px-3 pt-4 pb-8 z-30 flex items-center justify-center gap-6">
      <button
        onMouseDown={preventFocusLoss}
        onPointerDown={preventFocusLoss}
        onClick={onPlay}
        className={btnBase}
      >
        朗读
      </button>
      <button
        onMouseDown={preventFocusLoss}
        onPointerDown={preventFocusLoss}
        onClick={onValidate}
        className={btnBase}
      >
        校验
      </button>
      <button
        onMouseDown={preventFocusLoss}
        onPointerDown={preventFocusLoss}
        onClick={onToggleAnswer}
        className={btnBase}
      >
        {showAnswer ? '隐藏答案' : '答案'}
      </button>
      <button
        onMouseDown={preventFocusLoss}
        onPointerDown={preventFocusLoss}
        onClick={onAddVocab}
        disabled={isAddingToVocabulary || checkingVocabulary || isInVocabulary}
        className={`px-3 py-1.5 border rounded-md text-xs active:bg-slate-200 dark:active:bg-slate-600 ${
          isInVocabulary
            ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-300 text-indigo-600'
            : 'bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300'
        }`}
      >
        {isInVocabulary ? '已收藏' : '加入生词'}
      </button>
    </div>
  );
}
