'use client';

import type { KeyboardEvent } from 'react';
import MobileActionBar from './MobileActionBar';
import type { Word, WordInputStatus } from '../lib/types';

interface SpellingPracticeProps {
  currentWord: Word;
  currentWordParts: string[];
  userWordInputs: string[];
  wordInputStatus: WordInputStatus[];
  currentWordInputIndex: number;
  showAnswer: boolean;
  answerOverlayRevealed: boolean;
  showPhonetic: boolean;
  showTranslation: boolean;
  swapShortcutKeys: boolean;
  isInVocabulary: boolean;
  checkingVocabulary: boolean;
  isAddingToVocabulary: boolean;
  onInputChange: (value: string, index: number) => void;
  onInputKeyDown: (e: KeyboardEvent<HTMLInputElement>, index: number) => void;
  onValidate: (index: number) => void;
  onToggleAnswer: () => void;
  onPlay: () => void;
  onAddVocab: () => void;
}

export default function SpellingPractice({
  currentWord,
  currentWordParts,
  userWordInputs,
  wordInputStatus,
  currentWordInputIndex,
  showAnswer,
  answerOverlayRevealed,
  showPhonetic,
  showTranslation,
  swapShortcutKeys,
  isInVocabulary,
  checkingVocabulary,
  isAddingToVocabulary,
  onInputChange,
  onInputKeyDown,
  onValidate,
  onToggleAnswer,
  onPlay,
  onAddVocab,
}: SpellingPracticeProps) {
  return (
    <>
      {showAnswer && (
        <div
          className="flex justify-center items-center origin-top transition-all duration-500 ease-out z-10 mb-3"
          style={{
            opacity: answerOverlayRevealed ? 1 : 0,
            transform: answerOverlayRevealed ? 'translateY(0)' : 'translateY(-12px)',
          }}
        >
          <div className="bg-slate-100 dark:bg-slate-800 rounded-xl px-5 py-3 shadow-md max-w-full text-center">
            <p className="text-2xl sm:text-3xl font-base text-slate-800 dark:text-slate-200 break-words">
              {currentWord.word}
            </p>
          </div>
        </div>
      )}
      {!showAnswer && <div className="h-8 m-5" />}

      <div className="flex h-6 justify-center items-center gap-3 text-slate-400">
        {!!currentWord.phoneticUS && showPhonetic && (
          <div className="text-slate-600 rounded-md px-[6px] py-[2px]">
            /{currentWord.phoneticUS.replace(/^\/|\/$/g, '')}/
          </div>
        )}
      </div>

      {showTranslation && (
        <div className="flex justify-center text-xl md:text-2xl text-slate-600 whitespace-pre-line">
          {currentWord.translation.replace(/\\n/g, '\n')}
        </div>
      )}

      <div className="flex flex-wrap justify-center gap-3 mt-4">
        {currentWordParts.map((part, idx) => {
          const minWidth = 3;
          const width = Math.max(minWidth, part.length + 2);
          const status = wordInputStatus[idx] || 'pending';
          const borderClass =
            status === 'correct'
              ? 'border-emerald-500 text-emerald-500'
              : status === 'wrong'
              ? 'border-rose-500 text-rose-500'
              : 'border-slate-400 text-slate-600 hover:border-indigo-500 hover:text-indigo-500';

          return (
            <div key={idx}>
              <input
                autoComplete="off"
                id={`word-input-${idx}`}
                spellCheck={false}
                translate="no"
                className={`border-b-3 text-center text-2xl md:text-3xl font-medium focus:outline-none bg-transparent transition-colors ${borderClass}`}
                style={{
                  width: `${width}ch`,
                  minWidth: `${Math.max(minWidth, 3)}ch`,
                  padding: '0 0.5em',
                }}
                value={userWordInputs[idx] || ''}
                onChange={(e) => onInputChange(e.target.value, idx)}
                onKeyDown={(e) => onInputKeyDown(e, idx)}
                disabled={idx !== currentWordInputIndex}
                autoFocus={idx === currentWordInputIndex}
              />
            </div>
          );
        })}
      </div>

      <ShortcutHelp swapShortcutKeys={swapShortcutKeys} />

      <MobileActionBar
        showAnswer={showAnswer}
        isInVocabulary={isInVocabulary}
        checkingVocabulary={checkingVocabulary}
        isAddingToVocabulary={isAddingToVocabulary}
        onPlay={onPlay}
        onValidate={() => onValidate(currentWordInputIndex)}
        onToggleAnswer={onToggleAnswer}
        onAddVocab={onAddVocab}
      />
    </>
  );
}

function ShortcutHelp({ swapShortcutKeys }: { swapShortcutKeys: boolean }) {
  return (
    <div className="hidden lg:block fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-slate-100 rounded-lg px-4 py-2 shadow-md w-[90%] max-w-max">
      <div className="text-slate-600 flex flex-col sm:flex-row justify-center items-center gap-4">
        <div className="w-full sm:w-auto" data-tour="word-shortcut-space">
          <kbd className="inline-block px-10 py-2 bg-white border-2 border-slate-300 rounded-md shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] active:shadow-[0px_0px_0px_0px_rgba(0,0,0,0.1)] active:translate-y-[2px] active:translate-x-[2px] transition-all">
            <div className="text-sm -mb-1">空格</div>
          </kbd>
          <span className="ml-2 text-sm text-slate-500">
            {swapShortcutKeys ? '空格键：校验单词是否正确' : '空格键：朗读单词'}
          </span>
        </div>
        <div className="w-full sm:w-auto" data-tour="word-shortcut-enter">
          <kbd className="inline-block px-4 py-2 bg-white border-2 border-slate-300 rounded-md shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] active:shadow-[0px_0px_0px_0px_rgba(0,0,0,0.1)] active:translate-y-[2px] active:translate-x-[2px] transition-all">
            <div className="flex items-center">
              <svg
                className="w-4 h-4 ml-1"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M20 4V10C20 11.0609 19.5786 12.0783 18.8284 12.8284C18.0783 13.5786 17.0609 14 16 14H4M4 14L8 10M4 14L8 18"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </kbd>
          <span className="ml-2 text-sm text-slate-500">
            {swapShortcutKeys ? '回车键：朗读单词' : '回车键：校验单词是否正确'}
          </span>
        </div>
        <div className="w-full sm:w-auto flex items-center" data-tour="word-shortcut-arrows">
          <div className="flex flex-col items-center gap-0.5">
            <kbd className="inline-block px-6 bg-white border-2 border-slate-300 rounded-t-md shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] active:shadow-[0px_0px_0px_0px_rgba(0,0,0,0.1)] active:translate-y-[2px] active:translate-x-[2px] transition-all">
              <div className="text-xs">▲</div>
            </kbd>
            <kbd className="inline-block px-6 bg-white border-2 border-slate-300 rounded-b-md shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] active:shadow-[0px_0px_0px_0px_rgba(0,0,0,0.1)] active:translate-y-[2px] active:translate-x-[2px] transition-all">
              <div className="text-xs">▼</div>
            </kbd>
          </div>
          <span className="ml-2 text-sm text-slate-500">▼键：显示答案, ▲键：隐藏答案</span>
        </div>
        <div className="w-full sm:w-auto" data-tour="word-shortcut-vocab">
          <kbd className="inline-block px-3 py-2 bg-white border-2 border-slate-300 rounded-md shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] active:shadow-[0px_0px_0px_0px_rgba(0,0,0,0.1)] active:translate-y-[2px] active:translate-x-[2px] transition-all">
            <div className="text-sm -mb-1">Ctrl</div>
          </kbd>
          <span className="mx-2">+</span>
          <kbd className="inline-block px-3 py-2 bg-white border-2 border-slate-300 rounded-md shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] active:shadow-[0px_0px_0px_0px_rgba(0,0,0,0.1)] active:translate-y-[2px] active:translate-x-[2px] transition-all">
            <div className="text-sm -mb-1">Q</div>
          </kbd>
          <span className="ml-2 text-sm text-slate-500">Control + Q：加入生词本</span>
        </div>
      </div>
    </div>
  );
}
