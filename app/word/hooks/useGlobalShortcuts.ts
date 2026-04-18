import { useEffect, useRef } from 'react';

interface UseGlobalShortcutsParams {
  enabled: boolean;
  swapShortcutKeys: boolean;
  onPlay: () => void;
  onShowAnswer: () => void;
  onHideAnswer: () => void;
  onAddVocab: () => void;
}

/**
 * 全局键盘快捷键：
 * - 默认空格键：朗读；调换后为回车
 * - ArrowDown / ArrowUp：显示 / 隐藏答案
 * - Ctrl+Q / Cmd+Q：加入生词本
 *
 * 通过 ref 保持最新的回调，避免频繁重新注册 listener 导致重复触发。
 */
export function useGlobalShortcuts({
  enabled,
  swapShortcutKeys,
  onPlay,
  onShowAnswer,
  onHideAnswer,
  onAddVocab,
}: UseGlobalShortcutsParams) {
  const callbacksRef = useRef({ onPlay, onShowAnswer, onHideAnswer, onAddVocab });

  useEffect(() => {
    callbacksRef.current = { onPlay, onShowAnswer, onHideAnswer, onAddVocab };
  }, [onPlay, onShowAnswer, onHideAnswer, onAddVocab]);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const playKey = swapShortcutKeys ? 'Enter' : ' ';
      if (e.key === playKey) {
        e.preventDefault();
        callbacksRef.current.onPlay();
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        callbacksRef.current.onShowAnswer();
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        callbacksRef.current.onHideAnswer();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'q') {
        e.preventDefault();
        callbacksRef.current.onAddVocab();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, swapShortcutKeys]);
}
