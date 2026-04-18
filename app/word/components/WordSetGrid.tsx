'use client';

import Image from 'next/image';
import { Baseline, Target, Users } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import LevelBadge from '@/components/common/LevelBadge';
import type { LevelType, ProFilterType } from '@/components/common/CourseFilter';
import type { WordSet } from '../lib/types';

interface WordSetGridProps {
  wordSets: WordSet[];
  isLoading: boolean;
  filterLevels: LevelType[];
  filterPro: ProFilterType[];
  lastStudiedSlug: string | null;
  reviewCount: number;
  vocabReviewCount: number;
  showReviewEntries: boolean;
  onSelectSet: (slug: string) => void;
  onEnterReview: () => void;
  onEnterVocabReview: () => void;
}

const cardClassName =
  'course-card w-[calc(50%-0.25rem)] sm:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.6666rem)] xl:w-[calc(25%-0.8333rem)] 2xl:p-4 p-2 sm:p-3 bg-white dark:bg-slate-800 rounded-xl shadow-sm cursor-pointer border border-slate-200 dark:border-slate-400 group';

export default function WordSetGrid({
  wordSets,
  isLoading,
  filterLevels,
  filterPro,
  lastStudiedSlug,
  reviewCount,
  vocabReviewCount,
  showReviewEntries,
  onSelectSet,
  onEnterReview,
  onEnterVocabReview,
}: WordSetGridProps) {
  if (isLoading) {
    return (
      <div className="flex flex-wrap gap-2 sm:gap-4 md:gap-3">
        {Array.from({ length: 12 }).map((_, idx) => (
          <div
            key={`word-set-skeleton-${idx}`}
            className="w-[calc(50%-0.25rem)] sm:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.6666rem)] xl:w-[calc(25%-0.8333rem)] 2xl:p-4 p-2 sm:p-3 bg-white dark:bg-slate-800 rounded-xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-400"
          >
            <div className="flex h-full">
              <Skeleton className="w-[56px] h-[79px] sm:w-[110px] sm:h-[156px] rounded-lg mr-1.5 sm:mr-2 3xl:mr-3 flex-shrink-0" />
              <div className="flex-1 flex flex-col justify-between min-w-0">
                <div>
                  <Skeleton className="h-4 sm:h-6 w-4/5 mb-2 sm:mb-3" />
                  <Skeleton className="h-3 sm:h-4 w-10 sm:w-16" />
                  <div className="mt-1.5 sm:mt-2">
                    <Skeleton className="h-4 sm:h-6 w-10 sm:w-14 rounded-full" />
                  </div>
                </div>
                <div>
                  <Skeleton className="h-3 sm:h-4 w-16 sm:w-28 mb-1" />
                  <Skeleton className="w-full h-1.5 sm:h-2" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const filteredSets = wordSets
    .filter((ws) => {
      if (filterPro.length > 0) {
        const match = filterPro.some((f) => (f === 'pro' ? ws.isPro : !ws.isPro));
        if (!match) return false;
      }
      if (filterLevels.length > 0) {
        if (!ws.level || !filterLevels.includes(ws.level as LevelType)) return false;
      }
      return true;
    })
    .sort((a, b) => {
      const aIsLast = a.slug === lastStudiedSlug ? 1 : 0;
      const bIsLast = b.slug === lastStudiedSlug ? 1 : 0;
      return bIsLast - aIsLast;
    });

  return (
    <div className="flex flex-wrap gap-2 sm:gap-4 md:gap-3">
      {showReviewEntries && reviewCount > 0 && (
        <div onClick={onEnterReview} className={cardClassName}>
          <div className="flex h-full">
            <div className="relative w-[56px] h-[79px] sm:w-[110px] sm:h-[156px] rounded-lg mr-1.5 sm:mr-2 3xl:mr-3 flex-shrink-0 bg-gradient-to-br from-rose-400 to-orange-500 flex items-center justify-center">
              <div className="text-white text-center">
                <Target className="w-5 h-5 sm:w-8 sm:h-8 mx-auto mb-0.5 sm:mb-2" />
                <div className="font-bold text-[10px] sm:text-base leading-tight">错词复习</div>
              </div>
            </div>
            <div className="flex-1 flex flex-col justify-between min-w-0">
              <div>
                <h3 className="font-bold text-xs sm:text-lg mb-1 sm:mb-2">错题复习</h3>
                <div className="flex items-center gap-1.5 sm:gap-3 text-[10px] sm:text-sm text-slate-500">
                  <div className="flex items-center">
                    <Baseline className="w-3 h-3 sm:w-4 sm:h-4" />
                    <p className="ml-0.5 sm:ml-0">{reviewCount} 词</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showReviewEntries && vocabReviewCount > 0 && (
        <div onClick={onEnterVocabReview} className={cardClassName}>
          <div className="flex h-full">
            <div className="relative w-[56px] h-[79px] sm:w-[110px] sm:h-[156px] rounded-lg mr-1.5 sm:mr-2 3xl:mr-3 flex-shrink-0 bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center">
              <div className="text-white text-center">
                <Target className="w-5 h-5 sm:w-8 sm:h-8 mx-auto mb-0.5 sm:mb-2" />
                <div className="font-bold text-[10px] sm:text-base leading-tight">生词复习</div>
              </div>
            </div>
            <div className="flex-1 flex flex-col justify-between min-w-0">
              <div>
                <h3 className="font-bold text-xs sm:text-lg mb-1 sm:mb-2">生词复习</h3>
                <div className="flex items-center gap-1.5 sm:gap-3 text-[10px] sm:text-sm text-slate-500">
                  <div className="flex items-center">
                    <Baseline className="w-3 h-3 sm:w-4 sm:h-4" />
                    <p className="ml-0.5 sm:ml-0">{vocabReviewCount} 词</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {filteredSets.map((ws) => (
        <div
          key={ws.id}
          onClick={() => onSelectSet(ws.slug)}
          className={`${cardClassName} relative`}
        >
          {ws.slug === lastStudiedSlug && (
            <span className="absolute top-0 right-0 z-10 bg-indigo-500 text-white text-[10px] px-1.5 sm:px-2 py-0.5 rounded-bl-xl shadow-sm opacity-70">
              上次学习
            </span>
          )}
          <div className="flex h-full">
            <div className="relative w-[56px] h-[79px] sm:w-[110px] sm:h-[156px] rounded-lg mr-1.5 sm:mr-2 3xl:mr-3 flex-shrink-0 bg-gradient-to-br from-indigo-400 to-purple-500">
              {ws.coverImage ? (
                <Image
                  fill
                  src={(ws.coverImage || '').trim()}
                  alt={ws.name}
                  className="w-full h-full object-cover rounded-lg"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white text-[10px] sm:text-lg font-bold px-1 sm:px-4 leading-tight">
                  {ws.name}
                </div>
              )}
            </div>
            <div className="flex-1 flex flex-col justify-between min-w-0">
              <div>
                <h3 className="font-bold text-xs sm:text-lg mb-0.5 sm:mb-2 line-clamp-2 leading-tight">
                  {ws.name}
                </h3>
                <div className="flex items-center gap-1.5 sm:gap-3 text-[10px] sm:text-sm text-slate-500">
                  <div className="flex items-center">
                    <Baseline className="w-3 h-3 sm:w-4 sm:h-4" />
                    <p>{ws._count.words} 词</p>
                  </div>
                  <div className="flex items-center">
                    <Users className="w-3 h-3 sm:w-4 sm:h-4" />
                    <p className="ml-1">{ws.learnersCount ?? 0}人</p>
                  </div>
                </div>
                <div className="mt-0.5 sm:mt-2 flex items-center gap-1">
                  {ws.isPro ? (
                    <span className="text-[9px] sm:text-xs bg-orange-600 text-white rounded-full px-1.5 py-0.5 sm:px-3 sm:py-1">
                      会员
                    </span>
                  ) : (
                    <span className="text-[9px] sm:text-xs bg-emerald-600 text-white rounded-full px-1.5 py-0.5 sm:px-3 sm:py-1">
                      免费
                    </span>
                  )}
                  <LevelBadge
                    level={ws.level}
                    className="text-[9px] sm:text-xs px-1.5 py-[1px] sm:px-3 sm:py-[3px]"
                  />
                </div>
              </div>
              <div>
                <div className="text-[10px] sm:text-sm text-slate-500">
                  进度：{ws._count.done > 0 ? `${ws._count.done}/${ws._count.words}` : '未开始'}
                </div>
                <Progress
                  value={(ws._count.done / ws._count.words) * 100}
                  className="w-full h-1 sm:h-2"
                />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
