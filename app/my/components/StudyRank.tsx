'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Image from 'next/image';
import { RANK_PERIODS } from '@/constants';
import { cn } from "@/lib/utils";
import Empty from '@/components/common/Empty';
import { LiquidTabs } from '@/components/ui/liquid-tabs';

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

function StudyRank() {
  const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'year'>('day');
  const [items, setItems] = useState<RankItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<{ userId: string; minutes: number; rank: number } | null>(null);

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
        // 限制只显示前30名
        const limitedData = (data.data as RankItem[]).slice(0, 30);

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
        onValueChange={(value) => setPeriod(value as 'day' | 'week' | 'month' | 'year')}
        className="py-2"
      />

      {loading ? (
        <div className="flex justify-center items-center h-32">加载中...</div>
      ) : error ? (
        <div className="text-red-500 text-center">{error}</div>
      ) : (
        <div className="rounded-md border dark:border-gray-700 bg-white dark:bg-gray-900">
          {items.length === 0 ? (
            <div className="flex justify-center items-center py-12">
              <Empty text="暂无排行数据" />
            </div>
          ) : (
            <>
              {/* 表头 */}
              <div className="flex items-center gap-4 px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                <div className="flex-shrink-0 w-12 flex items-center justify-center">
                  <span className="text-base font-bold text-gray-600 dark:text-gray-400">排名</span>
                </div>
                <div className="flex-shrink-0 w-10"></div>
                <div className="flex-1 min-w-0">
                  <span className="text-base font-bold text-gray-600 dark:text-gray-400">用户</span>
                </div>
                <div className="flex-shrink-0 w-24 text-center">
                  <span className="text-base font-bold text-gray-600 dark:text-gray-400">学习时长</span>
                </div>
                <div className="flex-shrink-0 w-20 text-center">
                  <span className="text-base font-bold text-gray-600 dark:text-gray-400">单词数</span>
                </div>
                <div className="flex-shrink-0 w-20 text-center">
                  <span className="text-base font-bold text-gray-600 dark:text-gray-400">句子数</span>
                </div>
                <div className="flex-shrink-0 w-20 text-center">
                  <span className="text-base font-bold text-gray-600 dark:text-gray-400">跟读次数</span>
                </div>
              </div>

              {/* 数据列表 */}
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {items.map((row) => (
                  <div
                    key={row.userId}
                    className={cn(
                      "flex items-center gap-4 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors",
                      currentUser?.userId && row?.userId === currentUser.userId && 'bg-blue-50 dark:bg-blue-900/20'
                    )}
                  >
                    {/* 排名 */}
                    <div className="flex-shrink-0 w-12 flex items-center justify-center">
                      {row.rank <= 3 ? (
                        <Image
                          src={row.rank === 1 ? "/images/first.png" : row.rank === 2 ? "/images/second.png" : "/images/third.png"}
                          alt={`第${row.rank}名`}
                          width={32}
                          height={32}
                          className="object-contain"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full border-2 border-purple-400 dark:border-purple-500 flex items-center justify-center">
                          <span className="text-sm font-bold text-purple-600 dark:text-purple-400">{row.rank}</span>
                        </div>
                      )}
                    </div>

                    {/* 头像 */}
                    <div className="flex-shrink-0 ml-4">
                      {row.avatar && row.avatar.trim() !== '' ? (
                        <Image
                          src={row.avatar}
                          alt={row.userName}
                          width={40}
                          height={40}
                          className="rounded-full object-cover h-10 w-10"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                          <span className="text-gray-500 dark:text-gray-400 text-lg">👤</span>
                        </div>
                      )}
                    </div>

                    {/* 用户名 */}
                    <div className="flex-1 min-w-0">
                      <div className="text-base font-bold dark:text-gray-300 truncate">
                        {row.userName || `#${row.userId.slice(-8)}`}
                      </div>
                    </div>

                    {/* 学习时长 */}
                    <div className="flex-shrink-0 w-24 flex items-center justify-center gap-1 text-gray-600 dark:text-gray-400">
                      <span className="text-sm font-bold text-gray-600 dark:text-gray-400">{formatMinutes(row.minutes)}</span>
                    </div>

                    {/* 单词数 */}
                    <div className="flex-shrink-0 w-20 text-center">
                      <span className="text-sm font-bold text-gray-600 dark:text-gray-400">{row.wordCount}</span>
                    </div>

                    {/* 句子数 */}
                    <div className="flex-shrink-0 w-20 text-center">
                      <span className="text-sm font-bold text-gray-600 dark:text-gray-400">{row.sentenceCount}</span>
                    </div>

                    {/* 跟读次数 */}
                    <div className="flex-shrink-0 w-20 text-center">
                      <span className="text-sm  font-bold text-gray-600 dark:text-gray-400">{row.shadowingCount}</span>
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
              <div className="sticky bottom-0 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <div className="px-4 py-3 flex items-center">
                  <div className="text-base font-medium dark:text-gray-300 mr-4">
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
                    <div className="flex-shrink-0 w-24 flex items-center justify-center gap-1 text-gray-600 dark:text-gray-400">
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
