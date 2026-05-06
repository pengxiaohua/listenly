'use client';

import type { MouseEvent, PointerEvent } from 'react';
import { BookmarkPlus, BookmarkCheck, Lightbulb, Check } from 'lucide-react';

interface MobileActionBarProps {
  showAnswer: boolean;
  isInVocabulary: boolean;
  checkingVocabulary: boolean;
  isAddingToVocabulary: boolean;
  onValidate: () => void;
  onToggleAnswer: () => void;
  onAddVocab: () => void;
}

/**
 * 移动端/平板（≤1024px）操作栏，紧贴输入框下方显示。
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
  onValidate,
  onToggleAnswer,
  onAddVocab,
}: MobileActionBarProps) {
  const preventFocusLoss = (e: MouseEvent | PointerEvent) => {
    e.preventDefault();
  };

  const btnBase =
    'inline-flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-xs text-slate-700 dark:text-slate-300 active:bg-slate-200 dark:active:bg-slate-600';

  return (
    <div className="lg:hidden mt-6 flex items-center justify-center gap-3">
      <button
        onMouseDown={preventFocusLoss}
        onPointerDown={preventFocusLoss}
        onClick={onAddVocab}
        disabled={isAddingToVocabulary || checkingVocabulary || isInVocabulary}
        className={`inline-flex items-center gap-1 px-3 py-1.5 border rounded-md text-xs active:bg-slate-200 dark:active:bg-slate-600 ${
          isInVocabulary
            ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-300 text-indigo-600'
            : 'bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300'
        }`}
      >
        {isInVocabulary ? (
          <BookmarkCheck className="w-3.5 h-3.5" />
        ) : (
          <BookmarkPlus className="w-3.5 h-3.5" />
        )}
        {isInVocabulary ? '已收藏' : '加入生词'}
      </button>
      <button
        onMouseDown={preventFocusLoss}
        onPointerDown={preventFocusLoss}
        onClick={onToggleAnswer}
        className={btnBase}
      >
        <Lightbulb className="w-3.5 h-3.5" />
        {showAnswer ? '隐藏提示' : '提示'}
      </button>
      <button
        onMouseDown={preventFocusLoss}
        onPointerDown={preventFocusLoss}
        onClick={onValidate}
        className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 border border-indigo-600 rounded-md text-xs text-white active:bg-indigo-700"
      >
        <Check className="w-3.5 h-3.5" />
        校验
      </button>
    </div>
  );
}
