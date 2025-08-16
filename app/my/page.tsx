'use client';

import { useEffect, useState, useCallback } from 'react';
import dayjs from 'dayjs';

import { wordsTagsChineseMap, PAGE_SIZE_OPTIONS, WordTags } from '@/constants';
import { cn, formatTimeForDisplay } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import AuthGuard from '@/components/auth/AuthGuard'
import { toast } from 'sonner';
import Image from 'next/image';
import { useAuthStore } from '@/store/auth';
import StudyHeatmap from '@/components/common/StudyHeatmap';

interface WordRecord {
  id: string;
  isCorrect: boolean;
  errorCount: number;
  lastAttempt: string;
  word: {
    id: string;
    word: string;
    phoneticUK: string;
    phoneticUS: string;
    translation: string;
    category: WordTags;
  }
}

interface SentenceRecord {
  id: number;
  sentenceId: number;
  sentence: string;
  userInput: string;
  correct: boolean;
  errorCount: number;
  createdAt: string;
  corpusName: string;
}

interface UserProfile {
  id: string;
  userName: string;
  avatar: string;
}

// 生词本 - 类型定义
type VocabularyWordItem = {
  word?: {
    word: string;
    translation: string;
    category: WordTags;
  };
  createdAt: string;
};

type VocabularySentenceItem = {
  sentence?: {
    text: string;
    translation?: string | null;
    corpus?: { name: string } | null;
  };
  createdAt: string;
};

// 错词本 - 类型定义
type WrongWordItem = {
  word?: {
    word: string;
    translation: string;
    category: WordTags;
  };
  createdAt: string;
};

type WrongSentenceItem = {
  sentence?: {
    text: string;
    translation?: string | null;
    corpus?: { name: string } | null;
  };
  createdAt: string;
};

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

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
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

function UserProfileComponent() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editedUserName, setEditedUserName] = useState('');
  const [editedAvatar, setEditedAvatar] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // 获取全局状态更新函数
  const setUserInfo = useAuthStore(state => state.setUserInfo);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const response = await fetch('/api/user');
      if (response.ok) {
        const data = await response.json();
        setProfile(data);
        setEditedUserName(data.userName);
        setEditedAvatar(data.avatar);
      } else {
        console.error('API响应失败:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('获取用户信息失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!editedUserName) {
      toast.error('请输入用户名');
      return;
    }

    try {
      setUploading(true);

      let avatarUrl = editedAvatar;

      // 如果有新的头像文件，先上传
      if (avatarFile) {
        const formData = new FormData();
        formData.append('avatar', avatarFile);

        const uploadResponse = await fetch('/api/user/avatar', {
          method: 'POST',
          body: formData,
        });

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json();
          toast.error(errorData.error || '头像上传失败');
          return;
        }

        const uploadResult = await uploadResponse.json();
        avatarUrl = uploadResult.url;
      }

      // 更新用户信息
      const response = await fetch('/api/user', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userName: editedUserName,
          avatar: avatarUrl,
        }),
      });

      if (response.ok) {
        const updatedProfile = await response.json();
        setProfile(updatedProfile);
        setEditing(false);
        setAvatarFile(null);

        // 同步更新全局状态，确保Header中的头像也更新
        setUserInfo({
          userName: updatedProfile.userName,
          avatar: updatedProfile.avatar,
          isAdmin: updatedProfile.isAdmin,
        });

        toast.success('个人信息更新成功');
      } else {
        throw new Error('更新失败');
      }
    } catch (error) {
      console.error('更新用户信息失败:', error);
      toast.error('更新失败，请重试');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-[calc(100vh-64px)]">加载中...</div>;
  }

  if (!profile) {
    return <div className="flex justify-center items-center h-[calc(100vh-64px)]">获取用户信息失败</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      <div className="flex items-center gap-6">
        {/* <Avatar className="w-24 h-24">
          <AvatarImage src={profile.avatar} />
          <Image src={profile.avatar} alt="头像" width={96} height={96} />
          <AvatarFallback>用户</AvatarFallback>
        </Avatar> */}
          {profile.avatar && profile.avatar.trim() !== '' ? (
            <Image
              src={profile.avatar}
              alt="头像"
              width={96}
              height={96}
              className="rounded-full object-cover h-[96px] w-[96px]"
            />
          ) : (
          <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center">
            <span className="text-gray-500 text-2xl">👤</span>
          </div>
        )}
        <div className="flex-1 space-y-4">
          {editing ? (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">用户名</label>
                <Input
                  value={editedUserName}
                  onChange={(e) => setEditedUserName(e.target.value)}
                  placeholder="请输入用户名"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">头像</label>
                <div className="flex items-center gap-4">
                  <Avatar className="w-16 h-16">
                    <AvatarImage src={avatarFile ? URL.createObjectURL(avatarFile) : editedAvatar} />
                    <AvatarFallback>预览</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <label
                      htmlFor="avatar-upload"
                      className="inline-block px-4 py-2 rounded-full text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
                    >
                      选择文件
                    </label>
                    <input
                      id="avatar-upload"
                      type="file"
                      accept="image/png,image/jpeg,image/jpg"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setAvatarFile(file);
                        }
                      }}
                      className="hidden"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      支持 PNG、JPG、JPEG 格式，文件大小不超过 5MB
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  className='cursor-pointer'
                  onClick={handleSave}
                  disabled={uploading}
                >
                  {uploading ? '保存中...' : '保存'}
                </Button>
                <Button
                  className='cursor-pointer'
                  variant="outline"
                  onClick={() => {
                    setEditing(false);
                    setAvatarFile(null);
                  }}
                  disabled={uploading}
                >
                  取消
                </Button>
              </div>
            </>
          ) : (
            <>
              <div>
                <div className="text-sm text-gray-500">用户名</div>
                <div className="text-lg font-medium">{profile.userName}</div>
              </div>
              <Button className='cursor-pointer' onClick={() => setEditing(true)}>编辑资料</Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SentenceRecords() {
  const [records, setRecords] = useState<SentenceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'correct', 'incorrect'
  const [corpusFilter, setCorpusFilter] = useState('all');
  const [corpora, setCorpora] = useState<{ id: number; name: string; }[]>([]);

  // 添加分页相关状态
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [jumpToPage, setJumpToPage] = useState('');

  // 获取语料库列表
  useEffect(() => {
    fetch('/api/sentence/corpus')
      .then(res => res.json())
      .then(data => {
        setCorpora(data);
      })
      .catch(error => {
        console.error('获取语料库列表失败:', error);
      });
  }, []);

  const fetchRecords = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/sentence/records?page=${currentPage}&pageSize=${pageSize}&filter=${filter}&corpusId=${corpusFilter}`
      );
      const data = await response.json();

      if (data.records) {
        setRecords(data.records);
        setTotalItems(data.total);
        setTotalPages(Math.ceil(data.total / pageSize));
      }
    } catch (error) {
      console.error("获取记录失败:", error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, filter, corpusFilter]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // 处理页面跳转
  const handleJumpToPage = (e: React.FormEvent) => {
    e.preventDefault();
    const page = parseInt(jumpToPage);
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
    setJumpToPage('');
  };

  if (loading) return <div className="flex justify-center items-center h-[calc(100vh-64px)]">加载中...</div>;

  return (
    <div>
      <div className="flex gap-4 mb-6">
        <div className='flex gap-2 items-center'>
          <label className="block text-sm">状态筛选</label>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="选择状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="correct">已掌握</SelectItem>
              <SelectItem value="incorrect">未掌握</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className='flex gap-2 items-center'>
          <label className="block text-sm">语料库筛选</label>
          <Select value={corpusFilter} onValueChange={setCorpusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="选择语料库" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部语料库</SelectItem>
              {corpora.map(corpus => (
                <SelectItem key={corpus.id} value={corpus.id.toString()}>
                  {corpus.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-md border dark:border-gray-700">
        <Table>
          <TableHeader>
            <TableRow className="dark:border-gray-700 dark:hover:bg-gray-800/50">
              <TableHead className="dark:text-gray-400">句子</TableHead>
              <TableHead className="dark:text-gray-400">语料库</TableHead>
              <TableHead className="dark:text-gray-400">状态</TableHead>
              <TableHead className="dark:text-gray-400">错误次数</TableHead>
              <TableHead className="dark:text-gray-400">最后尝试时间</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center dark:text-gray-400">
                  暂无记录
                </TableCell>
              </TableRow>
            ) : (
              records.map((record, index) => (
                <TableRow key={record.id} className={cn(
                  index % 2 === 0 ? "bg-gray-100" : "bg-white",
                  "dark:bg-transparent dark:border-gray-700 dark:hover:bg-gray-800/50"
                )}>
                  <TableCell className="dark:text-gray-300">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <div className="truncate max-w-[300px]">
                            {record.sentence}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="whitespace-pre-line max-w-[500px]">
                            {record.sentence}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                  <TableCell className="dark:text-gray-300">{record.corpusName}</TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        'px-2 py-1 rounded',
                        record.correct
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                      )}
                    >
                      {record.correct ? '已掌握' : '未掌握'}
                    </span>
                  </TableCell>
                  <TableCell className="dark:text-gray-300">{record.errorCount}</TableCell>
                  <TableCell className="dark:text-gray-300">
                    {formatTimeForDisplay(record.createdAt)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* 添加分页组件 */}
      <div className="mt-4 flex gap-4 justify-between items-center">
        <div className="flex items-center gap-4">
          <Select
            value={pageSize.toString()}
            onValueChange={(value) => {
              setPageSize(Number(value));
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="选择每页条数" />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map(size => (
                <SelectItem key={size} value={size.toString()}>
                  每页 {size} 条
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <span className="text-sm text-gray-600">
            共 {totalItems} 条记录
          </span>

          <form onSubmit={handleJumpToPage} className="flex items-center gap-2">
            <span className="text-sm">跳至</span>
            <input
              type="number"
              min="1"
              max={totalPages}
              value={jumpToPage}
              onChange={(e) => setJumpToPage(e.target.value)}
              className="border rounded w-16 p-2"
            />
            <span className="text-sm">页</span>
            <button
              type="submit"
              className="px-3 py-1 bg-primary text-primary-foreground rounded hover:bg-primary/90 cursor-pointer"
            >
              跳转
            </button>
          </form>
        </div>
        <Pagination className='flex-1'>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className={cn(
                  "cursor-pointer select-none",
                  currentPage === 1 && "pointer-events-none opacity-50"
                )}
              >
                上一页
              </PaginationPrevious>
            </PaginationItem>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(page => {
                return (
                  page === 1 ||
                  page === totalPages ||
                  Math.abs(page - currentPage) <= 1
                );
              })
              .map((page, index, array) => {
                if (index > 0 && page - array[index - 1] > 1) {
                  return (
                    <PaginationItem key={`ellipsis-${page}`}>
                      <PaginationEllipsis />
                    </PaginationItem>
                  );
                }
                return (
                  <PaginationItem key={page}>
                    <PaginationLink
                      isActive={page === currentPage}
                      onClick={() => setCurrentPage(page)}
                      className="cursor-pointer"
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}

            <PaginationItem>
              <PaginationNext
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className={cn(
                  "cursor-pointer select-none",
                  currentPage === totalPages && "pointer-events-none opacity-50"
                )}
              >
                下一页
              </PaginationNext>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  );
}

function WordRecords() {
  const [records, setRecords] = useState<WordRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'correct', 'incorrect'
  const [categoryFilter, setCategoryFilter] = useState<WordTags | 'all'>('all');

  // 添加分页相关状态
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [jumpToPage, setJumpToPage] = useState('');

  const categories = Object.keys(wordsTagsChineseMap) as WordTags[];

  const fetchRecords = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/word/records?page=${currentPage}&pageSize=${pageSize}&filter=${filter}&category=${categoryFilter}`
      );
      const data = await response.json();

      if (data.records) {
        setRecords(data.records);
        setTotalItems(data.total);
        setTotalPages(Math.ceil(data.total / pageSize));
      }
    } catch (error) {
      console.error("获取记录失败:", error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, filter, categoryFilter]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // 处理页面跳转
  const handleJumpToPage = (e: React.FormEvent) => {
    e.preventDefault();
    const page = parseInt(jumpToPage);
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
    setJumpToPage('');
  };

  // 处理翻译文本的函数
  const formatTranslation = (translation: string) => {
    return translation.split('\\n').join('\n');
  };

  if (loading) return <div className="flex justify-center items-center h-[calc(100vh-64px)]">加载中...</div>;

  return (
    <div>
      <div className="flex gap-4 mb-6">
        <div className='flex gap-2 items-center'>
          <label className="block text-sm">状态筛选</label>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="选择状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="correct">已掌握</SelectItem>
              <SelectItem value="incorrect">未掌握</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className='flex gap-2 items-center'>
          <label className="block text-sm">分类筛选</label>
          <Select value={categoryFilter} onValueChange={(value: WordTags | 'all') => setCategoryFilter(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="选择分类" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部分类</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat} value={cat}>
                  {wordsTagsChineseMap[cat]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-md border dark:border-gray-700">
        <Table>
          <TableHeader>
            <TableRow className="dark:border-gray-700 dark:hover:bg-gray-800/50">
              <TableHead className="dark:text-gray-400">单词</TableHead>
              <TableHead className="dark:text-gray-400 w-[200px]">翻译</TableHead>
              <TableHead className="dark:text-gray-400">分类</TableHead>
              <TableHead className="dark:text-gray-400">状态</TableHead>
              <TableHead className="dark:text-gray-400">错误次数</TableHead>
              <TableHead className="dark:text-gray-400">最后尝试时间</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center dark:text-gray-400">
                  暂无记录
                </TableCell>
              </TableRow>
            ) : (
              records.map((record, index) => (
                <TableRow key={record.id} className={cn(
                  index % 2 === 0 ? "bg-gray-100" : "bg-white",
                  "dark:bg-transparent dark:border-gray-700 dark:hover:bg-gray-800/50"
                )}>
                  <TableCell className="dark:text-gray-300">{record.word.word}</TableCell>
                  <TableCell>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <div className="truncate max-w-[200px] dark:text-gray-300">
                            {record.word.translation.split('\\r\\n')[0]}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="whitespace-pre-line">
                            {formatTranslation(record.word.translation)}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                  <TableCell className="dark:text-gray-300">
                    {wordsTagsChineseMap[record.word.category] || record.word.category}
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        'px-2 py-1 rounded',
                        record.isCorrect
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                      )}
                    >
                      {record.isCorrect ? '已掌握' : '未掌握'}
                    </span>
                  </TableCell>
                  <TableCell className="dark:text-gray-300">{record.errorCount}</TableCell>
                  <TableCell className="dark:text-gray-300">
                    {formatTimeForDisplay(record.lastAttempt)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      {/* 添加分页组件 */}
      <div className="mt-4 flex gap-4 justify-between items-center">
        <div className="flex items-center gap-4">
          <Select
            value={pageSize.toString()}
            onValueChange={(value) => {
              setPageSize(Number(value));
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="选择每页条数" />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map(size => (
                <SelectItem key={size} value={size.toString()}>
                  每页 {size} 条
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <span className="text-sm text-gray-600">
            共 {totalItems} 条记录
          </span>

          <form onSubmit={handleJumpToPage} className="flex items-center gap-2">
            <span className="text-sm">跳至</span>
            <input
              type="number"
              min="1"
              max={totalPages}
              value={jumpToPage}
              onChange={(e) => setJumpToPage(e.target.value)}
              className="border rounded w-16 p-2"
            />
            <span className="text-sm">页</span>
            <button
              type="submit"
              className="px-3 py-1 bg-primary text-primary-foreground rounded hover:bg-primary/90 cursor-pointer"
            >
              跳转
            </button>
          </form>
        </div>
        <Pagination className='flex-1'>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className={cn(
                  "cursor-pointer select-none",
                  currentPage === 1 && "pointer-events-none opacity-50"
                )}
              >
                上一页
              </PaginationPrevious>
            </PaginationItem>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(page => {
                return (
                  page === 1 ||
                  page === totalPages ||
                  Math.abs(page - currentPage) <= 1
                );
              })
              .map((page, index, array) => {
                if (index > 0 && page - array[index - 1] > 1) {
                  return (
                    <PaginationItem key={`ellipsis-${page}`}>
                      <PaginationEllipsis />
                    </PaginationItem>
                  );
                }
                return (
                  <PaginationItem key={page}>
                    <PaginationLink
                      isActive={page === currentPage}
                      onClick={() => setCurrentPage(page)}
                      className="cursor-pointer"
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}

            <PaginationItem>
              <PaginationNext
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className={cn(
                  "cursor-pointer select-none",
                  currentPage === totalPages && "pointer-events-none opacity-50"
                )}
              >
                下一页
              </PaginationNext>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  );
}

function VocabularyComponent() {
  const [activeTab, setActiveTab] = useState<'word' | 'sentence'>('word');
  const [vocabularyWords, setVocabularyWords] = useState<VocabularyWordItem[]>([]);
  const [vocabularySentences, setVocabularySentences] = useState<VocabularySentenceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });

  const fetchVocabulary = useCallback(async (page: number = 1) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/vocabulary?type=${activeTab}&page=${page}&limit=${pagination.limit}`);
      const data = await response.json();

      if (data.success) {
        if (activeTab === 'word') {
          setVocabularyWords(data.data as VocabularyWordItem[]);
        } else {
          setVocabularySentences(data.data as VocabularySentenceItem[]);
        }
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('获取生词本失败:', error);
    } finally {
      setLoading(false);
    }
  }, [activeTab, pagination.limit]);

  useEffect(() => {
    fetchVocabulary();
  }, [activeTab, fetchVocabulary]);

  return (
    <div className="space-y-4">
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setActiveTab('word')}
          className={`px-4 py-2 rounded-lg cursor-pointer ${
            activeTab === 'word'
              ? 'bg-primary text-primary-foreground'
              : 'bg-transparent hover:bg-primary/5'
          }`}
        >
          单词生词本
        </button>
        <button
          onClick={() => setActiveTab('sentence')}
          className={`px-4 py-2 rounded-lg cursor-pointer ${
            activeTab === 'sentence'
              ? 'bg-primary text-primary-foreground'
              : 'bg-transparent hover:bg-primary/5'
          }`}
        >
          句子生词本
        </button>
      </div>
      <div>
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : (
          <div className="text-center text-gray-500">
            {/* 增加生词记录表格 */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{activeTab === 'word' ? '单词' : '句子'}</TableHead>
                  <TableHead>翻译</TableHead>
                  <TableHead>分类</TableHead>
                  <TableHead>加入时间</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className='text-left'>
                {activeTab === 'word' ? vocabularyWords.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.word?.word}</TableCell>
                    <TableCell>{item.word?.translation}</TableCell>
                    <TableCell>{item.word?.category}</TableCell>
                    <TableCell>{dayjs(item.createdAt).format('YYYY-MM-DD HH:mm:ss')}</TableCell>
                  </TableRow>
                )) : vocabularySentences.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.sentence?.text}</TableCell>
                    <TableCell>{item.sentence?.translation || '-'}</TableCell>
                    <TableCell>{item.sentence?.corpus?.name || '-'}</TableCell>
                    <TableCell>{dayjs(item.createdAt).format('YYYY-MM-DD HH:mm:ss')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {(activeTab === 'word' ? vocabularyWords.length : vocabularySentences.length) === 0
              ? '暂无生词本记录'
              : `共 ${(activeTab === 'word' ? vocabularyWords.length : vocabularySentences.length)} 条记录`}
          </div>
        )}
      </div>
    </div>
  );
}

function WrongWordsComponent() {
  const [activeTab, setActiveTab] = useState<'word' | 'sentence'>('word');
  const [wrongWordItems, setWrongWordItems] = useState<WrongWordItem[]>([]);
  const [wrongSentenceItems, setWrongSentenceItems] = useState<WrongSentenceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });

  const fetchWrongWords = useCallback(async (page: number = 1) => {
    setLoading(true);
    try {
      const endpoint = activeTab === 'word' ? '/api/word/wrong-words' : '/api/sentence/wrong-words';
      const response = await fetch(`${endpoint}?page=${page}&limit=${pagination.limit}`);
      const data = await response.json();

      if (data.success) {
        if (activeTab === 'word') {
          setWrongWordItems(data.data as WrongWordItem[]);
        } else {
          setWrongSentenceItems(data.data as WrongSentenceItem[]);
        }
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('获取错词本失败:', error);
    } finally {
      setLoading(false);
    }
  }, [activeTab, pagination.limit]);

  useEffect(() => {
    fetchWrongWords();
  }, [activeTab, fetchWrongWords]);

  return (
    <div className="space-y-4">
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setActiveTab('word')}
          className={`px-4 py-2 rounded-lg cursor-pointer ${
            activeTab === 'word'
              ? 'bg-primary text-primary-foreground'
              : 'bg-transparent hover:bg-primary/5'
          }`}
        >
          单词错词本
        </button>
        <button
          onClick={() => setActiveTab('sentence')}
          className={`px-4 py-2 rounded-lg cursor-pointer ${
            activeTab === 'sentence'
              ? 'bg-primary text-primary-foreground'
              : 'bg-transparent hover:bg-primary/5'
          }`}
        >
          句子错词本
        </button>
      </div>
      <div>
      {loading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : (
          <div className="text-center text-gray-500">
            {/* 增加生词记录表格 */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{activeTab === 'word' ? '单词' : '句子'}</TableHead>
                  <TableHead>翻译</TableHead>
                  <TableHead>分类</TableHead>
                  <TableHead>加入时间</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className='text-left'>
                {activeTab === 'word' ? wrongWordItems.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <span className='font-bold'>{item.word?.word || '-'}</span>
                    </TableCell>
                    <TableCell className='max-w-3xs overflow-hidden'>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className='max-w-xl truncate block'>
                              {item.word?.translation || '-'}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <span className='whitespace-pre-wrap'>
                              {item.word?.translation || '-'}
                            </span>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell>{item.word?.category ? wordsTagsChineseMap[item.word.category] : '-'}</TableCell>
                    <TableCell>{dayjs(item.createdAt).format('YYYY-MM-DD HH:mm:ss')}</TableCell>
                  </TableRow>
                )) : wrongSentenceItems.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.sentence?.text || '-'}</TableCell>
                    <TableCell>{item.sentence?.translation || '-'}</TableCell>
                    <TableCell>{item.sentence?.corpus?.name || '-'}</TableCell>
                    <TableCell>{dayjs(item.createdAt).format('YYYY-MM-DD HH:mm:ss')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {(activeTab === 'word' ? wrongWordItems.length : wrongSentenceItems.length) === 0
              ? '暂无生词本记录'
              : `共 ${(activeTab === 'word' ? wrongWordItems.length : wrongSentenceItems.length)} 条记录`}
          </div>
        )}
      </div>
    </div>
  );
}

function LearningRecords() {
  const [activeTab, setActiveTab] = useState<'spelling' | 'dictation'>('spelling');

  return (
    <div className="space-y-4">
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setActiveTab('spelling')}
          className={`px-4 py-2 rounded-lg cursor-pointer ${
            activeTab === 'spelling'
              ? 'bg-primary text-primary-foreground'
              : 'bg-transparent hover:bg-primary/5'
          }`}
        >
          单词拼写记录
        </button>
        <button
          onClick={() => setActiveTab('dictation')}
          className={`px-4 py-2 rounded-lg cursor-pointer ${
            activeTab === 'dictation'
              ? 'bg-primary text-primary-foreground'
              : 'bg-transparent hover:bg-primary/5'
          }`}
        >
          句子听写记录
        </button>
      </div>
      <div>
        {activeTab === 'spelling' ? <WordRecords /> : <SentenceRecords />}
      </div>
    </div>
  );
}

export default function MyRecords() {
  return (
    <AuthGuard>
      <div className="container mx-auto p-6">
        <Tabs defaultValue="records" orientation="vertical" className="flex gap-6 !flex-row">
          <TabsList className="h-58 w-30 flex flex-col bg-transparent">
            <TabsTrigger
              value="records"
              className="w-full h-10 justify-start gap-2 p-3 data-[state=active]:bg-primary/5 rounded-lg cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
              学习记录
            </TabsTrigger>
            <TabsTrigger
              value="vocabulary"
              className="w-full h-10 justify-start gap-2 p-3 data-[state=active]:bg-primary/5 rounded-lg cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/><path d="M9 8h6"/><path d="M9 12h6"/><path d="M9 16h6"/></svg>
              生词本
            </TabsTrigger>
            <TabsTrigger
              value="wrong-words"
              className="w-full h-10 justify-start gap-2 p-3 data-[state=active]:bg-primary/5 rounded-lg cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/><path d="M9 8h6"/><path d="M9 12h6"/><path d="M9 16h6"/></svg>
              错词本
            </TabsTrigger>
            <TabsTrigger
              value="heatmap"
              className="w-full h-10 justify-start gap-2 p-3 data-[state=active]:bg-primary/5 rounded-lg cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><rect x="7" y="7" width="3" height="3"/><rect x="14" y="7" width="3" height="3"/><rect x="7" y="14" width="3" height="3"/><rect x="14" y="14" width="3" height="3"/></svg>
              学习热力图
            </TabsTrigger>
            <TabsTrigger
              value="profile"
              className="w-full h-10 justify-start gap-2 p-3 data-[state=active]:bg-primary/5 rounded-lg cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 1 0-16 0"/></svg>
              个人信息
            </TabsTrigger>
            <TabsTrigger
              value="leaderboard"
              className="w-full h-10 justify-start gap-2 p-3 data-[state=active]:bg-primary/5 rounded-lg cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M7 13l3-3 4 4 5-5"/></svg>
              排行榜
            </TabsTrigger>
          </TabsList>
          <div className="flex-1">
            <TabsContent value="records" className="m-0">
              <div className="border rounded-lg p-6">
                <h2 className="text-2xl font-semibold mb-6">学习记录</h2>
                <LearningRecords />
              </div>
            </TabsContent>
            <TabsContent value="vocabulary" className="m-0">
              <div className="border rounded-lg p-6">
                <h2 className="text-2xl font-semibold mb-6">生词本</h2>
                <VocabularyComponent />
              </div>
            </TabsContent>
            <TabsContent value="wrong-words" className="m-0">
              <div className="border rounded-lg p-6">
                <h2 className="text-2xl font-semibold mb-6">错词本</h2>
                <WrongWordsComponent />
              </div>
            </TabsContent>
            <TabsContent value="heatmap" className="m-0">
              <div className="border rounded-lg p-6">
                <StudyHeatmap />
              </div>
            </TabsContent>
            <TabsContent value="profile" className="m-0">
              <div className="border rounded-lg p-6">
                <h2 className="text-2xl font-semibold mb-6">个人信息</h2>
                <UserProfileComponent />
              </div>
            </TabsContent>
            <TabsContent value="leaderboard" className="m-0">
              <div className="border rounded-lg p-6">
                <h2 className="text-2xl font-semibold mb-6">学习时长排行榜</h2>
                <StudyTimeLeaderboard />
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </AuthGuard>
  );
}
