'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import Empty from '@/components/common/Empty';
import { Trophy, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

type RankItem = {
  userId: string;
  userName: string;
  avatar: string;
  minutes: number;
  rank: number;
  memberPlan: string;
};

function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) return `${hours}时${mins}分`;
  return `${mins}分`;
}

const memberBadge: Record<string, { label: string; cls: string }> = {
  yearly: { label: '年度会员', cls: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
  quarterly: { label: '季度会员', cls: 'text-blue-600 bg-blue-50 border-blue-200' },
  monthly: { label: '月度会员', cls: 'text-green-600 bg-green-50 border-green-200' },
  test: { label: '测试会员', cls: 'text-green-600 bg-green-50 border-green-200' },
  free: { label: '免费会员', cls: 'text-slate-500 bg-slate-50 border-slate-200' },
};

export default function HomeRankCard() {
  const [items, setItems] = useState<RankItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<{ userId: string; minutes: number; rank: number } | null>(null);
  const isRequestingRef = useRef(false);
  const router = useRouter();

  const fetchData = useCallback(async () => {
    if (isRequestingRef.current) return;
    isRequestingRef.current = true;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/user/study-time?period=day');
      const data = await res.json();
      if (data.success) {
        setItems((data.data as RankItem[]).slice(0, 50));
        setCurrentUser(data.currentUser || null);
      } else {
        setError(data.error || '获取排行榜失败');
      }
    } catch {
      setError('获取排行榜失败');
    } finally {
      setLoading(false);
      isRequestingRef.current = false;
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="bg-card rounded-xl border border-border flex flex-col">
      {/* 标题 */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/20">
            <Trophy className="w-5 h-5 text-amber-500" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">今日排行榜</h3>
        </div>
        <div
          className="flex items-center gap-0.5 text-sm text-indigo-500 cursor-pointer hover:text-indigo-600 transition-colors"
          onClick={() => router.push('/my?tab=rank')}
        >
          查看全部排行榜
          <ChevronRight className="w-4 h-4" />
        </div>
      </div>

      {/* 表头 */}
      <div className="flex items-center gap-4 px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border-y border-slate-200 dark:border-slate-700">
        <div className="flex-shrink-0 w-12 text-center">
          <span className="text-sm font-bold text-slate-600 dark:text-slate-400">排名</span>
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-bold text-slate-600 dark:text-slate-400">用户</span>
        </div>
        <div className="flex-shrink-0 w-20 text-center">
          <span className="text-sm font-bold text-slate-600 dark:text-slate-400">学习时长</span>
        </div>
      </div>


      {/* 固定高度内容区域 */}
      <div className="h-[176px] overflow-y-auto">
        {loading ? (
          <div className="flex justify-center items-center h-full">加载中...</div>
        ) : error ? (
          <div className="flex justify-center items-center h-full text-rose-500">{error}</div>
        ) : items.length === 0 ? (
          <div className="flex justify-center items-center h-full">
            <Empty size='sm' text="暂无排行数据" />
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {items.map((row) => (
              <div
                key={row.userId}
                className={cn(
                  'flex items-center gap-4 px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors',
                  currentUser?.userId && row.userId === currentUser.userId && 'bg-indigo-50 dark:bg-indigo-900/20'
                )}
              >
                {/* 排名 */}
                <div className="flex-shrink-0 w-12 flex items-center justify-center">
                  {row.rank <= 3 ? (
                    <Image
                      src={row.rank === 1 ? '/images/first.png' : row.rank === 2 ? '/images/second.png' : '/images/third.png'}
                      alt={`第${row.rank}名`}
                      width={28}
                      height={28}
                      className="object-contain"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full border-2 border-purple-400 dark:border-purple-500 flex items-center justify-center">
                      <span className="text-xs font-bold text-purple-600 dark:text-purple-400">{row.rank}</span>
                    </div>
                  )}
                </div>

                {/* 头像 + 用户名 */}
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  {row.avatar && row.avatar.trim() !== '' ? (
                    <Image
                      src={row.avatar}
                      alt={row.userName}
                      width={32}
                      height={32}
                      className="rounded-full object-cover h-8 w-8 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                      <span className="text-slate-500 dark:text-slate-400 text-sm">👤</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-sm font-bold dark:text-slate-300 truncate">
                      {row.userName || `#${row.userId.slice(-8)}`}
                    </span>
                    {(() => {
                      const badge = memberBadge[row.memberPlan] || memberBadge.free;
                      return (
                        <span className={`shrink-0 text-xs leading-none px-1.5 py-0.5 rounded-full border font-medium ${badge.cls}`}>
                          {badge.label}
                        </span>
                      );
                    })()}
                  </div>
                </div>

                {/* 学习时长 */}
                <div className="flex-shrink-0 w-20 text-center">
                  <span className="text-sm font-bold text-slate-600 dark:text-slate-400">{formatMinutes(row.minutes)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 我的排名 > 30 时显示 */}
      {currentUser && currentUser.rank > 30 && (
        <div className="border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-2 flex items-center gap-4">
          <span className="text-sm font-medium dark:text-slate-300">我的日榜排名</span>
          <div className="w-7 h-7 rounded-full border-2 border-purple-400 dark:border-purple-500 flex items-center justify-center">
            <span className="text-xs font-bold text-purple-600 dark:text-purple-400">{currentUser.rank}</span>
          </div>
          <span className="text-sm font-bold text-slate-600 dark:text-slate-400">{formatMinutes(currentUser.minutes)}</span>
        </div>
      )}
    </div>
  );
}
