'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import dayjs from 'dayjs';
import { WordTags } from '@/constants';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

  const fetchVocabulary = useCallback(async (page: number = 1) => {
    // 防止重复请求
    if (isRequestingRef.current) {
      console.log('跳过重复请求');
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

export default VocabularyComponent;
