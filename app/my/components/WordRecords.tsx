'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { wordsTagsChineseMap, PAGE_SIZE_OPTIONS, WordTags } from '@/constants';
import { formatTimeForDisplay, cn } from "@/lib/utils";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import Empty from '@/components/common/Empty';

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

  // 使用useRef防止重复请求
  const isRequestingRef = useRef(false);

  const categories = Object.keys(wordsTagsChineseMap) as WordTags[];

  const fetchRecords = useCallback(async () => {
    // 防止重复请求
    if (isRequestingRef.current) {
      return;
    }

    isRequestingRef.current = true;

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
      isRequestingRef.current = false;
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
                  <Empty text="暂无记录" />
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

export default WordRecords;
