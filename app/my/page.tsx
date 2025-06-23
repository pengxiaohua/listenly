'use client';

import { useEffect, useState } from 'react';
import { wordsTagsChineseMap, PAGE_SIZE_OPTIONS, WordTags } from '@/constants';
import { cn } from "@/lib/utils";
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

function UserProfileComponent() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editedUserName, setEditedUserName] = useState('');
  const [editedAvatar, setEditedAvatar] = useState('');

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
      }
    } catch (error) {
      console.error('获取用户信息失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!editedUserName || !editedAvatar) {
      toast.error('请输入用户名和头像URL');
      return;
    }
    try {
      const response = await fetch('/api/user', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userName: editedUserName,
          avatar: editedAvatar,
        }),
      });

      if (response.ok) {
        const updatedProfile = await response.json();
        setProfile(updatedProfile);
        setEditing(false);
      }
    } catch (error) {
      console.error('更新用户信息失败:', error);
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
        <Avatar className="w-24 h-24">
          <AvatarImage src={profile.avatar} />
          <AvatarFallback>用户</AvatarFallback>
        </Avatar>
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
                <label className="text-sm font-medium">头像URL</label>
                <Input
                  value={editedAvatar}
                  onChange={(e) => setEditedAvatar(e.target.value)}
                  placeholder="请输入头像URL"
                />
              </div>
              <div className="flex gap-2">
                <Button className='cursor-pointer' onClick={handleSave}>保存</Button>
                <Button className='cursor-pointer' variant="outline" onClick={() => setEditing(false)}>取消</Button>
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

  useEffect(() => {
    fetchRecords();
  }, [currentPage, pageSize, filter, corpusFilter]);

  // 处理页面跳转
  const handleJumpToPage = (e: React.FormEvent) => {
    e.preventDefault();
    const page = parseInt(jumpToPage);
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
    setJumpToPage('');
  };

  const fetchRecords = async () => {
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
                    {new Date(record.createdAt).toLocaleString('zh-CN')}
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

  useEffect(() => {
    fetchRecords();
  }, [currentPage, pageSize, filter, categoryFilter]);

  // 处理页面跳转
  const handleJumpToPage = (e: React.FormEvent) => {
    e.preventDefault();
    const page = parseInt(jumpToPage);
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
    setJumpToPage('');
  };

  const fetchRecords = async () => {
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
                    {new Date(record.lastAttempt).toLocaleString('zh-CN')}
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
      <div className="max-w-6xl mx-auto p-6">
        <Tabs defaultValue="records" orientation="vertical" className="flex gap-6 !flex-row">
          <TabsList className="h-20 w-30 flex flex-col bg-transparent">
            <TabsTrigger
              value="records"
              className="w-full h-10 justify-start gap-2 p-3 data-[state=active]:bg-primary/5 rounded-lg cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
              学习记录
            </TabsTrigger>
            <TabsTrigger
              value="profile"
              className="w-full h-10 justify-start gap-2 p-3 data-[state=active]:bg-primary/5 rounded-lg cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 1 0-16 0"/></svg>
              个人信息
            </TabsTrigger>
          </TabsList>
          <div className="flex-1">
            <TabsContent value="records" className="m-0">
              <div className="border rounded-lg p-6">
                <h2 className="text-2xl font-semibold mb-6">学习记录</h2>
                <LearningRecords />
              </div>
            </TabsContent>
            <TabsContent value="profile" className="m-0">
              <div className="border rounded-lg p-6">
                <h2 className="text-2xl font-semibold mb-6">个人信息</h2>
                <UserProfileComponent />
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </AuthGuard>
  );
}
