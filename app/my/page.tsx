'use client';

import { useEffect, useState } from 'react';
import { wordsTagsChineseMap } from '@/constants';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

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
    category: string;
  }
}

export default function MyRecords() {
  const [records, setRecords] = useState<WordRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'correct', 'incorrect'
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    // 移除 session 检查，直接获取记录
    fetchRecords();
  }, []); // 移除 session 依赖

  const fetchRecords = async () => {
    try {
      setLoading(true);
      // 使用新的API路径
      const response = await fetch('/api/my-records/hua');  // 直接在URL中使用固定用户ID
      const data = await response.json();

      if (data.records) {
        setRecords(data.records);

        // 提取所有分类
        const cats = [...new Set(data.records.map((r: WordRecord) => r.word.category))];
        setCategories(cats);
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

  const filteredRecords = records.filter(record => {
    const matchesStatus =
      filter === 'all' ||
      (filter === 'correct' && record.isCorrect) ||
      (filter === 'incorrect' && !record.isCorrect);

    const matchesCategory =
      categoryFilter === 'all' ||
      record.word.category === categoryFilter;

    return matchesStatus && matchesCategory;
  });

  if (loading) return <div className="flex justify-center items-center h-[calc(100vh-64px)]">加载中...</div>;

  return (
    <div className="max-w-6xl mx-auto p-6 mt-8">
      <h1 className="text-2xl font-bold mb-6">我的拼写记录</h1>

      <div className="flex gap-4 mb-6">
        <div>
          <label className="block text-sm mb-2">状态筛选</label>
          <select
            className="border rounded p-2"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">全部</option>
            <option value="correct">已掌握</option>
            <option value="incorrect">未掌握</option>
          </select>
        </div>

        <div>
          <label className="block text-sm mb-2">分类筛选</label>
          <select
            className="border rounded p-2"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="all">全部分类</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>
                {wordsTagsChineseMap[cat] || cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white shadow rounded">
        <table className="min-w-full">
          <thead>
            <tr className="bg-gray-100">
              <th className="py-3 px-4 text-left">单词</th>
              <th className="py-3 px-4 text-left">美式音标</th>
              <th className="py-3 px-4 text-left">英式音标</th>
              <th className="py-3 px-4 text-left w-[200px]">翻译</th>
              <th className="py-3 px-4 text-left">分类</th>
              <th className="py-3 px-4 text-left">状态</th>
              <th className="py-3 px-4 text-left">错误次数</th>
              <th className="py-3 px-4 text-left">最后尝试时间</th>
            </tr>
          </thead>
          <tbody>
            {filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-4 px-4 text-center">暂无记录</td>
              </tr>
            ) : (
              filteredRecords.map(record => (
                <tr key={record.id} className="border-t">
                  <td className="py-3 px-4">{record.word.word}</td>
                  <td className="py-3 px-4">/{record.word.phoneticUK}/</td>
                  <td className="py-3 px-4">/{record.word.phoneticUS}/</td>
                  <td className="py-3 px-4">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <div
                            className="truncate max-w-[200px]"
                          >
                            {record.word.translation.split('\\r\\n')[0]}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className='whitespace-pre-line'>{formatTranslation(record.word.translation)}</div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </td>
                  <td className="py-3 px-4">{wordsTagsChineseMap[record.word.category] || record.word.category}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded ${record.isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {record.isCorrect ? '已掌握' : '未掌握'}
                    </span>
                  </td>
                  <td className="py-3 px-4">{record.errorCount}</td>
                  <td className="py-3 px-4">{new Date(record.lastAttempt).toLocaleString('zh-CN')}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
