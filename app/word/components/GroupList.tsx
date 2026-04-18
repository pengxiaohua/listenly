'use client';

import Image from 'next/image';
import { ChevronLeft, Clock, Hourglass, Lock, Users } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import LevelBadge from '@/components/common/LevelBadge';
import { formatLastStudiedTime } from '@/lib/timeUtils';
import type { WordGroupSummary, WordSet } from '../lib/types';

type DisplayGroup = WordGroupSummary & { start?: number; end?: number };

interface GroupListProps {
  selectedSet: WordSet | null;
  setSlug: string;
  displayGroups: DisplayGroup[];
  isUserPro: boolean;
  onBack: () => void;
  onSelectGroup: (order: number) => void;
  onVipGate: () => void;
}

export default function GroupList({
  selectedSet,
  setSlug,
  displayGroups,
  isUserPro,
  onBack,
  onSelectGroup,
  onVipGate,
}: GroupListProps) {
  const totalWords = displayGroups.reduce((s, g) => s + g.total, 0);
  const totalDone = displayGroups.reduce((s, g) => s + g.done, 0);

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onBack}
            className="px-2 py-2 mb-4 bg-slate-200 dark:bg-slate-800 rounded-full cursor-pointer hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors flex items-center justify-center"
          >
            <ChevronLeft className="w-4 h-4 md:w-6 md:h-6" />
          </button>
        </TooltipTrigger>
        <TooltipContent>返回</TooltipContent>
      </Tooltip>

      <div className="mb-4 p-3 sm:p-4 border rounded-lg bg-white dark:bg-slate-900 flex items-center gap-2.5 sm:gap-4">
        <div className="w-16 h-[88px] sm:w-22 sm:h-30 rounded overflow-hidden flex-shrink-0 bg-gradient-to-br from-indigo-400 to-purple-500">
          {selectedSet?.coverImage ? (
            <Image
              width={96}
              height={96}
              src={(selectedSet.coverImage || '').trim()}
              alt={selectedSet.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white text-xs sm:text-sm font-bold px-1 sm:px-2 text-center">
              {selectedSet?.name || setSlug}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-base sm:text-2xl font-semibold truncate">
            {selectedSet?.name || setSlug}
          </div>
          <div className="text-xs sm:text-base text-slate-500 mt-0.5 sm:mt-1 flex gap-2 sm:gap-4 flex-wrap">
            <span>共 {displayGroups.length} 组</span>
            <span>单词数：{totalWords}</span>
            <span>总进度：{totalDone}/{totalWords || 0}</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 mt-2 sm:mt-4">
            <div className="text-xs sm:text-sm flex items-center text-slate-500">
              <Users className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="ml-0.5 sm:ml-1">{selectedSet?.learnersCount}人</span>
            </div>
            {selectedSet?.isPro ? (
              <span className="text-[10px] sm:text-xs border bg-orange-500 text-white rounded-full px-2 py-0.5 sm:px-3 sm:py-1 flex items-center justify-center">
                会员
              </span>
            ) : (
              <span className="text-[10px] sm:text-xs border bg-emerald-500 text-white rounded-full px-2 py-0.5 sm:px-3 sm:py-1 flex items-center justify-center">
                免费
              </span>
            )}
            <LevelBadge
              level={selectedSet?.level}
              className="text-[10px] sm:text-xs px-2 py-[1px] sm:px-3 sm:py-[3px]"
            />
          </div>
          {selectedSet?.description && (
            <div className="text-xs sm:text-sm text-slate-600 mt-1 line-clamp-2">
              {selectedSet.description}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-4">
        {displayGroups.map((g) => {
          const isVirtual = g.id < 0;
          const displayText =
            g.kind === 'SIZE' || isVirtual
              ? (() => {
                  if (isVirtual && g.start && g.end) {
                    return `${g.start}-${g.end}`;
                  }
                  const idx = displayGroups.findIndex((gg) => gg.id === g.id);
                  const prevTotal =
                    idx > 0 ? displayGroups.slice(0, idx).reduce((s, gg) => s + gg.total, 0) : 0;
                  const start = prevTotal + 1;
                  const end = start + g.total - 1;
                  return `${start}-${end}`;
                })()
              : `第${g.order}组`;

          const locked = !!selectedSet?.isPro && !isUserPro;

          return (
            <button
              key={g.id}
              onClick={() => {
                if (locked) {
                  onVipGate();
                  return;
                }
                onSelectGroup(g.order);
              }}
              className="text-left p-2.5 sm:p-4 border rounded hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer flex flex-col"
            >
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="text-base sm:text-2xl font-semibold">{g.name}</div>
                {locked && <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-500" />}
              </div>
              <div className="text-xs sm:text-base text-slate-500 mt-0.5 sm:mt-1">
                {displayText}
              </div>
              <div className="flex flex-wrap gap-1.5 sm:gap-4 items-center mt-0.5 sm:mt-1">
                <div className="text-xs sm:text-base text-slate-500 flex items-center">
                  <Hourglass className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="ml-0.5 sm:ml-1">
                    {g.done}/{g.total}
                  </span>
                </div>
                {!isVirtual && (
                  <div className="text-xs sm:text-base text-slate-500 flex items-center">
                    <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="ml-0.5 sm:ml-1">
                      {formatLastStudiedTime(g.lastStudiedAt)}
                    </span>
                  </div>
                )}
                {g.done >= g.total && (
                  <div className="text-[10px] sm:text-xs border bg-emerald-500 text-white rounded-full px-2 py-0.5 sm:px-3 sm:py-1 flex items-center justify-center">
                    已完成
                  </div>
                )}
              </div>
              {g.done > 0 && g.done < g.total && (
                <Progress
                  value={(g.done / g.total) * 100}
                  className="w-full h-1.5 sm:h-2 mt-1.5 sm:mt-2"
                />
              )}
            </button>
          );
        })}
      </div>
    </>
  );
}
