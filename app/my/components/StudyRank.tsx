'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Image from 'next/image';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { RANK_PERIODS } from '@/constants';
import { cn } from "@/lib/utils";
import Empty from '@/components/common/Empty';

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
              <TableRow className="dark:border-gray-700 dark:hover:bg-gray-800/50">
                <TableHead className="w-20 dark:text-gray-400">排名</TableHead>
                <TableHead className="dark:text-gray-400">用户</TableHead>
                <TableHead className="dark:text-gray-400">学习时长(分钟)</TableHead>
                <TableHead className="dark:text-gray-400">单词数</TableHead>
                <TableHead className="dark:text-gray-400">句子数</TableHead>
                <TableHead className="dark:text-gray-400">跟读次数</TableHead>
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
                    'dark:bg-transparent dark:border-gray-700 dark:hover:bg-gray-800/50',
                    // 高亮当前用户的行
                    currentUser?.userId && row?.userId === currentUser.userId && 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700'
                  )}>
                    <TableCell className="font-medium">
                      {row.rank <= 3 ? (
                        <div className="flex items-center gap-2 text-center">
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
                        <span className="pl-2">{row.rank}</span>
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
                    </TableCell>
                    <TableCell className="dark:text-gray-300">{row.minutes}</TableCell>
                    <TableCell className="dark:text-gray-300">{row.wordCount}</TableCell>
                    <TableCell className="dark:text-gray-300">{row.sentenceCount}</TableCell>
                    <TableCell className="dark:text-gray-300">{row.shadowingCount}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          {currentUser ? (
            <div className="text-sm text-gray-600 p-3">我的排名：第 {currentUser.rank} 名，时长 {currentUser.minutes} 分钟</div>
          ) : (
            <div className="text-sm text-gray-600 p-3">我的排名：未上榜</div>
          )}
        </div>
      )}
    </div>
  );
}

export default StudyRank;
