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
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('day');
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
      <div className="flex gap-2">
        {
          RANK_PERIODS.map((periodItem) => (
            <Button
              key={periodItem.value}
              className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors cursor-pointer ${periodItem.value === period
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100  text-gray-700 dark:bg-gray-800 dark:text-gray-300'
              }`}
              variant="outline"
              onClick={() => setPeriod(periodItem.value)}
            >
              {periodItem.label}
            </Button>
          ))
        }
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-32">加载中...</div>
      ) : error ? (
        <div className="text-red-500 text-center">{error}</div>
      ) : (
        <div className="rounded-md border dark:border-gray-700">
          <Table>
            <TableHeader>
              <TableRow className="dark:border-gray-700 dark:hover:bg-gray-800/50 font-bold text-base">
                <TableHead className="w-26 dark:text-gray-400 text-center">排名</TableHead>
                <TableHead className="dark:text-gray-400">用户</TableHead>
                <TableHead className="dark:text-gray-400 text-center">学习时长(分钟)</TableHead>
                <TableHead className="dark:text-gray-400 text-center">单词数</TableHead>
                <TableHead className="dark:text-gray-400 text-center">句子数</TableHead>
                <TableHead className="dark:text-gray-400 text-center">跟读次数</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center dark:text-gray-400">
                    <Empty text="暂无排行数据" />
                  </TableCell>
                </TableRow>
              ) : (
                items.map((row, idx) => (
                  <TableRow key={row.userId} className={cn(
                    idx % 2 === 0 ? 'bg-gray-100' : 'bg-white',
                    'dark:bg-transparent dark:border-gray-700 dark:hover:bg-gray-800/50 text-center',
                    // 高亮当前用户的行
                    currentUser?.userId && row?.userId === currentUser.userId && 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700'
                  )}>
                    <TableCell className="font-medium">
                      {row.rank <= 3 ? (
                        <div className="flex items-center justify-center gap-2 text-center">
                          {row.rank === 1 && (
                            <Image
                              src="/images/first.png"
                              alt="第一名"
                              width={24}
                              height={24}
                              className="object-contain"
                            />
                          )}
                          {row.rank === 2 && (
                            <Image
                              src="/images/second.png"
                              alt="第二名"
                              width={24}
                              height={24}
                              className="object-contain"
                            />
                          )}
                          {row.rank === 3 && (
                            <Image
                              src="/images/third.png"
                              alt="第三名"
                              width={24}
                              height={24}
                              className="object-contain"
                            />
                          )}
                        </div>
                      ) : (
                        <span className="pl-2 font-bold">{row.rank}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {row.avatar && row.avatar.trim() !== '' ? (
                          <Image src={row.avatar} alt={row.userName} width={28} height={28} className="rounded-full object-cover h-[28px] w-[28px]" />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center">
                            <span className="text-gray-500 text-sm">👤</span>
                          </div>
                        )}
                        <span className="dark:text-gray-300">{row.userName}</span>
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
