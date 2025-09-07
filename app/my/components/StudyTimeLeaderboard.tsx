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
import { cn } from "@/lib/utils";

// 学习时长排行榜
type LeaderboardItem = {
  userId: string;
  userName: string;
  avatar: string;
  minutes: number;
  wordCount: number;
  sentenceCount: number;
  rank: number;
};

function StudyTimeLeaderboard() {
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('day');
  const [items, setItems] = useState<LeaderboardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<{ userId: string; minutes: number; rank: number } | null>(null);

  // 使用useRef防止重复请求
  const isRequestingRef = useRef(false);

  const fetchData = useCallback(async () => {
    // 防止重复请求
    if (isRequestingRef.current) {
      console.log('跳过重复请求');
      return;
    }

    isRequestingRef.current = true;

    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/user/study-time?period=${period}`);
      const data = await res.json();
      if (data.success) {
        setItems(data.data as LeaderboardItem[]);
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
        <Button
          className={cn('cursor-pointer', period === 'day' ? '' : 'variant-outline')}
          variant={period === 'day' ? 'default' : 'outline'}
          onClick={() => setPeriod('day')}
        >
          今日
        </Button>
        <Button
          className={cn('cursor-pointer', period === 'week' ? '' : 'variant-outline')}
          variant={period === 'week' ? 'default' : 'outline'}
          onClick={() => setPeriod('week')}
        >
          本周
        </Button>
        <Button
          className={cn('cursor-pointer', period === 'month' ? '' : 'variant-outline')}
          variant={period === 'month' ? 'default' : 'outline'}
          onClick={() => setPeriod('month')}
        >
          本月
        </Button>
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center dark:text-gray-400">暂无数据</TableCell>
                </TableRow>
              ) : (
                items.map((row, idx) => (
                  <TableRow key={row.userId} className={cn(
                    idx % 2 === 0 ? 'bg-gray-100' : 'bg-white',
                    'dark:bg-transparent dark:border-gray-700 dark:hover:bg-gray-800/50'
                  )}>
                    <TableCell className="font-medium">{row.rank}</TableCell>
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

export default StudyTimeLeaderboard;
