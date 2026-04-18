'use client';

import { BookTypeIcon, ChevronLeft, Expand, Shrink, Volume2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { Word, WordGroupSummary, WordSet } from '../lib/types';

interface PracticeTopBarProps {
  isReviewTag: boolean;
  totalWords: number;
  selectedSet: WordSet | null;
  selectedGroupId: number | null;
  displayGroups: WordGroupSummary[];
  audioUrl: string;
  isPlaying: boolean;
  currentWord: Word | null;
  isInVocabulary: boolean;
  checkingVocabulary: boolean;
  isAddingToVocabulary: boolean;
  showFullScreen: boolean;
  onBack: () => void;
  onPlay: () => void;
  onSpeak: () => void;
  onAddVocab: () => void;
  onFullScreen: () => void;
}

export default function PracticeTopBar({
  isReviewTag,
  totalWords,
  selectedSet,
  selectedGroupId,
  displayGroups,
  audioUrl,
  isPlaying,
  currentWord,
  isInVocabulary,
  checkingVocabulary,
  isAddingToVocabulary,
  showFullScreen,
  onBack,
  onPlay,
  onSpeak,
  onAddVocab,
  onFullScreen,
}: PracticeTopBarProps) {
  const group = selectedGroupId ? displayGroups.find((g) => g.id === selectedGroupId) : null;

  return (
    <div className="mb-4 flex items-center gap-4 justify-between">
      <div className="flex items-center gap-4">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onBack}
              className="px-2 py-2 bg-slate-200 dark:bg-slate-800 rounded-full cursor-pointer hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors flex items-center justify-center"
              data-tour="word-back-button"
            >
              <ChevronLeft className="w-4 h-4 md:w-6 md:h-6" />
            </button>
          </TooltipTrigger>
          <TooltipContent>返回</TooltipContent>
        </Tooltip>
        {isReviewTag && (
          <span className="text-sm text-slate-600 font-medium">剩余 {totalWords} 个</span>
        )}
      </div>

      {selectedSet && !isReviewTag && (
        <div className="flex-1 min-w-0 text-center">
          <span className="text-sm text-slate-500 truncate block">
            {selectedSet.name}
            {group ? ` / ${group.name}` : ''}
          </span>
        </div>
      )}

      <div className="flex items-center gap-4" data-tour="word-control-buttons">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => {
                if (!audioUrl) {
                  onSpeak();
                  return;
                }
                onPlay();
              }}
              className="px-2 py-2 bg-slate-200 rounded-full cursor-pointer hover:bg-slate-300"
            >
              <Volume2
                className={`w-4 h-4 md:w-6 md:h-6 cursor-pointer ${
                  isPlaying ? 'text-indigo-500' : 'dark:text-slate-600'
                }`}
              />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={6}>
            朗读单词
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onAddVocab}
              disabled={isAddingToVocabulary || checkingVocabulary || isInVocabulary || !currentWord}
              className={`flex items-center gap-2 p-2 rounded-full transition-colors cursor-pointer ${
                isInVocabulary
                  ? 'bg-indigo-100 cursor-default'
                  : 'px-2 py-2 bg-slate-200 hover:bg-slate-300'
              }`}
            >
              <BookTypeIcon
                className={`w-4 h-4 md:w-6 md:h-6 ${
                  checkingVocabulary || isAddingToVocabulary ? 'opacity-50' : ''
                } ${isInVocabulary ? 'text-indigo-600' : 'cursor-pointer text-slate-600'}`}
              />
            </button>
          </TooltipTrigger>
          <TooltipContent>
            {checkingVocabulary
              ? '检查中...'
              : isAddingToVocabulary
              ? '添加中...'
              : isInVocabulary
              ? '已在生词本'
              : '加入生词本'}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className="px-2 py-2 hidden md:block bg-slate-200 hover:bg-slate-300 rounded-full cursor-pointer"
              onClick={onFullScreen}
            >
              {showFullScreen ? (
                <Shrink className="w-6 h-6 cursor-pointer dark:text-slate-600" />
              ) : (
                <Expand className="w-6 h-6 cursor-pointer dark:text-slate-600" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent>{showFullScreen ? '退出全屏' : '全屏'}</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
