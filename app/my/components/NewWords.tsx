'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import dayjs from 'dayjs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Empty from '@/components/common/Empty';

// 生词本 - 类型定义
type VocabularyWordItem = {
  id: string;
  word?: {
    word: string;
    translation: string;
    phoneticUS: string;
  };
  createdAt: string;
};

type VocabularySentenceItem = {
  id: string;
  sentence?: {
    text: string;
    translation?: string | null;
    corpus?: { name: string } | null;
  };
  createdAt: string;
};

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

  // 使用useRef防止重复请求
  const isRequestingRef = useRef(false);

  const handleMasterClick = async (id: string) => {
    try {
      const response = await fetch('/api/vocabulary', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, isMastered: true }),
      });

      const data = await response.json();

      if (data.success) {
        // 从列表中移除该项
        if (activeTab === 'word') {
          setVocabularyWords(prev => prev.filter(item => item.id !== id));
        } else {
          setVocabularySentences(prev => prev.filter(item => item.id !== id));
        }
      }
    } catch (error) {
      console.error('更新掌握状态失败:', error);
    }
  };

  const fetchVocabulary = useCallback(async (page: number = 1) => {
    // 防止重复请求
    if (isRequestingRef.current) {
      return;
    }

    isRequestingRef.current = true;

    try {
      setLoading(true);
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
      isRequestingRef.current = false;
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
              ? 'bg-blue-500 text-primary-foreground'
              : 'bg-gray-200 hover:bg-primary/5'
          }`}
        >
          单词
        </button>
        <button
          onClick={() => setActiveTab('sentence')}
          className={`px-4 py-2 rounded-lg cursor-pointer ${
            activeTab === 'sentence'
              ? 'bg-blue-500 text-primary-foreground'
              : 'bg-gray-200 hover:bg-primary/5'
          }`}
        >
          句子
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
                  <TableHead>音标</TableHead>
                  <TableHead>加入时间</TableHead>
                  <TableHead className='text-center'>已学会</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className='text-left'>
                {activeTab === 'word' ? vocabularyWords.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className='font-bold'>{item.word?.word}</TableCell>
                    <TableCell>{item.word?.translation}</TableCell>
                    <TableCell>{item.word?.phoneticUS ? `/${item.word?.phoneticUS}/` : '-'}</TableCell>
                    <TableCell>{dayjs(item.createdAt).format('YYYY-MM-DD HH:mm:ss')}</TableCell>
                    <TableCell className='text-center'>
                      <input
                        type="checkbox"
                        className="w-4 h-4 cursor-pointer"
                        onChange={() => handleMasterClick(item.id)}
                      />
                    </TableCell>
                  </TableRow>
                )) : vocabularySentences.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className='font-bold'>{item.sentence?.text}</TableCell>
                    <TableCell>{item.sentence?.translation || '-'}</TableCell>
                    <TableCell>{item.sentence?.corpus?.name || '-'}</TableCell>
                    <TableCell>{dayjs(item.createdAt).format('YYYY-MM-DD HH:mm:ss')}</TableCell>
                    <TableCell className='text-center'>
                      <input
                        type="checkbox"
                        className="w-4 h-4 cursor-pointer"
                        onChange={() => handleMasterClick(item.id)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {(activeTab === 'word' ? vocabularyWords.length : vocabularySentences.length) === 0
              ?
              <Empty text="暂无生词本记录" />
              : `共 ${(activeTab === 'word' ? vocabularyWords.length : vocabularySentences.length)} 条记录`}
          </div>
        )}
      </div>
    </div>
  );
}

export default VocabularyComponent;
