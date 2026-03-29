'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Image from 'next/image';
import { RANK_PERIODS } from '@/constants';
import { cn } from "@/lib/utils";
import Empty from '@/components/common/Empty';
import { LiquidTabs } from '@/components/ui/liquid-tabs';
import { useIsMobile } from '@/lib/useIsMobile';

// 学习时长排行榜
type RankItem = {
  userId: string;
  userName: string;
  avatar: string;
  minutes: number;
  wordCount: number;
  sentenceCount: number;
  shadowingCount: number;
  rank: number;
  memberPlan: string;
};

// 将分钟数转换为"X时Y分"格式
function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `${hours}时${mins}分`;
  }
  return `${mins}分`;
}

const memberBadge: Record<string, { label: string; cls: string }> = {
  yearly:    { label: '年度会员', cls: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
  quarterly: { label: '季度会员', cls: 'text-blue-600 bg-blue-50 border-blue-200' },
  monthly:   { label: '月度会员', cls: 'text-green-600 bg-green-50 border-green-200' },
  trial:     { label: '试用会员', cls: 'text-orange-600 bg-orange-50 border-orange-200' },
  test:      { label: '测试会员', cls: 'text-green-600 bg-green-50 border-green-200' },
  free:      { label: '免费会员', cls: 'text-slate-500 bg-slate-50 border-slate-200' },
};

function StudyRank() {
  const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'year'>('day');
  const [items, setItems] = useState<RankItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<{ userId: string; minutes: number; rank: number } | null>(null);
  const isMobile = useIsMobile();

  // 使用useRef防止重复请求
  const isRequestingRef = useRef(false);

  const fetchData = useCallback(async () => {
    // 防止重复请求
    if (isRequestingRef.current) {
      return;
    }

    isRequestingRef.current = true;

    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/user/study-time?period=${period}`);
      const data = await res.json();
      if (data.success) {
        // 限制只显示前50名
        const limitedData = (data.data as RankItem[]).slice(0, 50);

        setItems(limitedData);
        setCurrentUser(data.currentUser || null);
      } else {
        setError(data.error || '获取排行榜失败');
      }
    } catch (err) {
      console.error('获取排行榜失败:', err);
      setError('获取排行榜失败');
    } finally {
      setLoading(false);
      isRequestingRef.current = false;
    }
  }, [period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="space-y-4">
      <LiquidTabs
        items={RANK_PERIODS}
        value={period}
        size={isMobile ? 'sm' : 'md'}
        onValueChange={(value) => setPeriod(value as 'day' | 'week' | 'month' | 'year')}
        className="py-2"
      />

      {loading ? (
        <div className="flex justify-center items-center h-32">加载中...</div>
      ) : error ? (
        <div className="text-rose-500 text-center">{error}</div>
      ) : (
        <div className="rounded-md border dark:border-slate-700 bg-white dark:bg-slate-900">
          {items.length === 0 ? (
            <div className="flex justify-center items-center py-12">
              <Empty text="暂无排行数据" />
            </div>
          ) : (
            <>
              {/* 表头 */}
              <div className="flex items-center gap-2 md:gap-4 px-3 md:px-4 py-2 md:py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                <div className="flex-shrink-0 w-8 md:w-12 flex items-center justify-center">
                  <span className="text-sm md:text-base font-bold text-slate-600 dark:text-slate-400">排名</span>
                </div>
                <div className="flex-shrink-0 w-7 md:w-10"></div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm md:text-base font-bold text-slate-600 dark:text-slate-400">用户</span>
                </div>
                <div className="flex-shrink-0 w-16 md:w-24 text-center">
                  <span className="text-sm md:text-base font-bold text-slate-600 dark:text-slate-400">学习时长</span>
                </div>
                <div className="flex-shrink-0 w-20 text-center hidden md:block">
                  <span className="text-base font-bold text-slate-600 dark:text-slate-400">单词数</span>
                </div>
                <div className="flex-shrink-0 w-20 text-center hidden md:block">
                  <span className="text-base font-bold text-slate-600 dark:text-slate-400">句子数</span>
                </div>
                <div className="flex-shrink-0 w-20 text-center hidden md:block">
                  <span className="text-base font-bold text-slate-600 dark:text-slate-400">跟读次数</span>
                </div>
              </div>

              {/* 数据列表 */}
              <div className="divide-y divide-slate-200 dark:divide-slate-700">
                {items.map((row) => (
                  <div
                    key={row.userId}
                    className={cn(
                      "flex items-center gap-2 md:gap-4 px-3 md:px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors",
                      currentUser?.userId && row?.userId === currentUser.userId && 'bg-indigo-50 dark:bg-indigo-900/20'
                    )}
                  >
                    {/* 排名 */}
                    <div className="flex-shrink-0 w-8 md:w-12 flex items-center justify-center">
                      {row.rank <= 3 ? (
                        <Image
                          src={row.rank === 1 ? "/images/first.png" : row.rank === 2 ? "/images/second.png" : "/images/third.png"}
                          alt={`第${row.rank}名`}
                          width={32}
                          height={32}
                          className="object-contain w-6 h-6 md:w-8 md:h-8"
                        />
                      ) : (
                        <div className="w-6 h-6 md:w-8 md:h-8 rounded-full border-2 border-purple-400 dark:border-purple-500 flex items-center justify-center">
                          <span className="text-xs md:text-sm font-bold text-purple-600 dark:text-purple-400">{row.rank}</span>
                        </div>
                      )}
                    </div>

                    {/* 头像 */}
                    <div className="flex-shrink-0 ml-0 md:ml-4">
                      {row.avatar && row.avatar.trim() !== '' ? (
                        <Image
                          src={row.avatar}
                          alt={row.userName}
                          width={40}
                          height={40}
                          className="rounded-full object-cover h-7 w-7 md:h-10 md:w-10"
                        />
                      ) : (
                        <div className="w-7 h-7 md:w-10 md:h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                          <span className="text-slate-500 dark:text-slate-400 text-sm md:text-lg">👤</span>
                        </div>
                      )}
                    </div>

                    {/* 用户名 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col md:flex-row md:items-center gap-0.5 md:gap-1.5">
                        <span className="text-xs md:text-base font-bold dark:text-slate-300 truncate">
                          {row.userName || `#${row.userId.slice(-8)}`}
                        </span>
                        {(() => {
                          const badge = memberBadge[row.memberPlan] || memberBadge.free;
                          return (
                            <span className={`shrink-0 w-fit text-[10px] md:text-xs leading-none px-1.5 md:px-2 py-0.5 md:py-1 rounded-full border font-medium ${badge.cls}`}>
                              {badge.label}
                            </span>
                          );
                        })()}
                      </div>
                    </div>

                    {/* 学习时长 */}
                    <div className="flex-shrink-0 w-16 md:w-24 flex items-center justify-center gap-1 text-slate-600 dark:text-slate-400">
                      <span className="text-xs md:text-sm font-bold text-slate-600 dark:text-slate-400">{formatMinutes(row.minutes)}</span>
                    </div>

                    {/* 单词数 */}
                    <div className="flex-shrink-0 w-20 text-center hidden md:block">
                      <span className="text-sm font-bold text-slate-600 dark:text-slate-400">{row.wordCount}</span>
                    </div>

                    {/* 句子数 */}
                    <div className="flex-shrink-0 w-20 text-center hidden md:block">
                      <span className="text-sm font-bold text-slate-600 dark:text-slate-400">{row.sentenceCount}</span>
                    </div>

                    {/* 跟读次数 */}
                    <div className="flex-shrink-0 w-20 text-center hidden md:block">
                      <span className="text-sm  font-bold text-slate-600 dark:text-slate-400">{row.shadowingCount}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* 我的排名 - 固定在底部 */}
          {/* 当我的排名大于30时 */}
          {currentUser && currentUser.rank > 30 && (() => {
            return (
              <div className="sticky bottom-0 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                <div className="px-4 py-3 flex items-center">
                  <div className="text-base font-medium dark:text-slate-300 mr-4">
                    我的{period === 'day' ? '日' : period === 'week' ? '周' : period === 'month' ? '月' : '年'}榜排名
                  </div>
                  <div className="flex items-center gap-4">
                    {/* 排名 */}
                    <div className="flex-shrink-0 w-12 flex items-center justify-center">
                      <div className="w-7 h-7 rounded-full border-2 border-purple-400 dark:border-purple-500 flex items-center justify-center">
                        <span className="text-sm font-bold text-purple-600 dark:text-purple-400">{currentUser.rank}</span>
                      </div>
                    </div>

                    {/* 学习时长 */}
                    <div className="flex-shrink-0 w-24 flex items-center justify-center gap-1 text-slate-600 dark:text-slate-400">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <span className="text-base font-bold">{formatMinutes(currentUser.minutes)}</span>
                    </div>

                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}

export default StudyRank;
