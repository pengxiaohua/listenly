'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { formatTimeForDisplay } from "@/lib/utils";
import { PAGE_SIZE_OPTIONS } from "@/constants";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import Empty from '@/components/common/Empty';

interface SentenceRecord {
  id: number;
  sentenceId: number;
  sentence: string;
  isCorrect: boolean;
  errorCount: number;
  createdAt: string;
  corpusName: string;
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

  // 使用useRef防止重复请求
  const isRequestingRef = useRef(false);

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
    // 防止重复请求
    if (isRequestingRef.current) {
      return;
    }

    isRequestingRef.current = true;

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
      isRequestingRef.current = false;
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
                  <Empty text="暂无记录" />
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

export default SentenceRecords;
