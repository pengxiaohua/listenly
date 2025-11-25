'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import dayjs from 'dayjs';
import Empty from '@/components/common/Empty';

// 生词本 - 类型定义
type VocabularyWordItem = {
  id: string;
  word?: { word: string; translation: string; phoneticUS: string };
  createdAt: string;
};

type VocabularySentenceItem = {
  id: string;
  sentence?: { text: string; translation?: string | null; corpus?: { name: string } | null };
  createdAt: string;
};

function VocabularyComponent() {
  const [activeTab, setActiveTab] = useState<'word' | 'sentence'>('word');
  const [vocabularyWords, setVocabularyWords] = useState<VocabularyWordItem[]>([]);
  const [vocabularySentences, setVocabularySentences] = useState<VocabularySentenceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 21, total: 0, pages: 0 });
  const isRequestingRef = useRef(false);

  const handleMasterClick = async (id: string) => {
    try {
      const response = await fetch('/api/vocabulary', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isMastered: true }),
      });
      const data = await response.json();
      if (data.success) {
        if (activeTab === 'word') setVocabularyWords(prev => prev.filter(i => i.id !== id));
        else setVocabularySentences(prev => prev.filter(i => i.id !== id));
      }
    } catch (error) {
      console.error('更新掌握状态失败:', error);
    }
  };

  const fetchVocabulary = useCallback(async (page: number = 1) => {
    if (isRequestingRef.current) return;
    isRequestingRef.current = true;
    try {
      setLoading(true);
      const response = await fetch(`/api/vocabulary?type=${activeTab}&page=${page}&limit=${pagination.limit}`);
      const data = await response.json();
      if (data.success) {
        if (activeTab === 'word') setVocabularyWords(data.data as VocabularyWordItem[]);
        else setVocabularySentences(data.data as VocabularySentenceItem[]);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('获取生词本失败:', error);
    } finally {
      setLoading(false);
      isRequestingRef.current = false;
    }
  }, [activeTab, pagination.limit]);

  useEffect(() => { setPagination(prev => ({ ...prev, page: 1 })); }, [activeTab]);
  useEffect(() => { fetchVocabulary(pagination.page); }, [activeTab, fetchVocabulary, pagination.page]);

  const items = activeTab === 'word' ? vocabularyWords : vocabularySentences;
  const hasPrev = pagination.page > 1; const hasNext = pagination.page < pagination.pages;

  return (
    <div className="space-y-4">
      <div className="flex gap-4 mb-6">
        <button onClick={() => setActiveTab('word')} className={`px-4 py-2 rounded-lg cursor-pointer ${activeTab==='word'?'bg-blue-500 text-primary-foreground':'bg-gray-200 hover:bg-primary/5'}`}>单词</button>
        <button onClick={() => setActiveTab('sentence')} className={`px-4 py-2 rounded-lg cursor-pointer ${activeTab==='sentence'?'bg-blue-500 text-primary-foreground':'bg-gray-200 hover:bg-primary/5'}`}>句子</button>
      </div>
      <div>
        {loading ? (
          <div className="flex justify-center items-center h-32"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div></div>
        ) : (
          <div className="space-y-4">
            {items.length === 0 ? (
              <Empty text={activeTab==='word'?'暂无生词本记录':'暂无生句本记录'} />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {activeTab==='word' ? vocabularyWords.map(item => (
                  <div key={item.id} className="p-4 border rounded-lg bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-semibold text-base break-words">{item.word?.word}</div>
                      <button onClick={() => handleMasterClick(item.id)} className="text-xs px-3 py-2 rounded bg-green-600 text-white hover:bg-green-700 cursor-pointer">学会了</button>
                    </div>
                    <div className="text-sm text-gray-600 line-clamp-1">{item.word?.translation}</div>
                    <div className="text-xs text-gray-400">加入时间：{dayjs(item.createdAt).format('YYYY-MM-DD HH:mm:ss')}</div>
                  </div>
                )) : vocabularySentences.map(item => (
                  <div key={item.id} className="p-4 border rounded-lg bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-semibold text-base break-words">{item.sentence?.text}</div>
                      <button onClick={() => handleMasterClick(item.id)} className="text-xs px-3 py-2 rounded bg-green-600 text-white hover:bg-green-700 cursor-pointer">学会了</button>
                    </div>
                    <div className="text-sm text-gray-600 line-clamp-1">{item.sentence?.translation || '-'}</div>
                    <div className="text-xs text-gray-400">加入时间：{dayjs(item.createdAt).format('YYYY-MM-DD HH:mm:ss')}</div>
                  </div>
                ))}
              </div>
            )}
            {items.length > 0 &&
              <div className="flex items-center justify-center gap-4 mt-2">
                <button disabled={!hasPrev} onClick={() => hasPrev && fetchVocabulary(pagination.page - 1)} className={`px-3 py-1 rounded border ${hasPrev?'hover:bg-gray-50 cursor-pointer':'opacity-50 cursor-not-allowed'}`}>◀︎ 上一页</button>
                <div className="text-sm text-gray-600">{pagination.page} / {pagination.pages || 1}</div>
                <button disabled={!hasNext} onClick={() => hasNext && fetchVocabulary(pagination.page + 1)} className={`px-3 py-1 rounded border ${hasNext?'hover:bg-gray-50 cursor-pointer':'opacity-50 cursor-not-allowed'}`}>下一页 ▶︎</button>
              </div>
            }
          </div>
        )}
      </div>
    </div>
  );
}

export default VocabularyComponent;
