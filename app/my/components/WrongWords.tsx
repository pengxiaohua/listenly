'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import dayjs from 'dayjs';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { LiquidTabs } from '@/components/ui/liquid-tabs';

import Empty from '@/components/common/Empty';

type WrongWordItem = {
  id: string;
  word?: { word: string; translation: string; phoneticUS: string };
  createdAt: string;
};

type WrongSentenceItem = {
  id: number;
  sentence?: { text: string; translation?: string | null; corpus?: { name: string } | null };
  createdAt: string;
};

function WrongWordsComponent() {
  const [activeTab, setActiveTab] = useState<'word' | 'sentence'>('word');
  const [wrongWordItems, setWrongWordItems] = useState<WrongWordItem[]>([]);
  const [wrongSentenceItems, setWrongSentenceItems] = useState<WrongSentenceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 21, total: 0, pages: 0 });
  const isRequestingRef = useRef(false);

  const handleMasterClick = async (id: string | number) => {
    try {
      const endpoint = activeTab === 'word' ? '/api/word/wrong-words' : '/api/sentence/wrong-words';
      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isMastered: true })
      });
      const data = await response.json();
      if (data.success) {
        if (activeTab === 'word') setWrongWordItems(prev => prev.filter(i => i.id !== id));
        else setWrongSentenceItems(prev => prev.filter(i => i.id !== id));
      }
    } catch (e) {
      console.error('更新掌握状态失败:', e);
    }
  };

  const fetchWrongWords = useCallback(async (page: number = 1) => {
    if (isRequestingRef.current) return;
    isRequestingRef.current = true;
    try {
      setLoading(true);
      const endpoint = activeTab === 'word' ? '/api/word/wrong-words' : '/api/sentence/wrong-words';
      const res = await fetch(`${endpoint}?page=${page}&limit=${pagination.limit}`);
      const data = await res.json();
      if (data.success) {
        if (activeTab === 'word') setWrongWordItems(data.data as WrongWordItem[]);
        else setWrongSentenceItems(data.data as WrongSentenceItem[]);
        setPagination(data.pagination);
      }
    } catch (e) {
      console.error('获取错词本失败:', e);
    } finally {
      setLoading(false);
      isRequestingRef.current = false;
    }
  }, [activeTab, pagination.limit]);

  useEffect(() => { setPagination(prev => ({ ...prev, page: 1 })); }, [activeTab]);
  useEffect(() => { fetchWrongWords(pagination.page); }, [activeTab, fetchWrongWords, pagination.page]);

  const items = activeTab === 'word' ? wrongWordItems : wrongSentenceItems;
  const hasPrev = pagination.page > 1; const hasNext = pagination.page < pagination.pages;

  return (
    <div className="space-y-4">
      <div className="mb-6">
        <LiquidTabs
          items={[
            { value: 'word', label: '单词' },
            { value: 'sentence', label: '句子' }
          ]}
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as 'word' | 'sentence')}
        />
      </div>
      <div>
        {loading ? (
          <div className="flex justify-center items-center h-32"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div></div>
        ) : (
          <div className="space-y-4">
            {items.length === 0 ? (
              <Empty text={activeTab === 'word' ? '暂无错词本记录' : '暂无错句本记录'} />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {activeTab === 'word' ? wrongWordItems.map(item => (
                  <div key={item.id} className="p-4 border rounded-lg bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-semibold text-base break-words">{item.word?.word || '-'}</div>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button onClick={() => handleMasterClick(item.id)} className="text-xs px-2 py-2 rounded-full bg-green-600 text-white hover:bg-green-700 cursor-pointer">
                            <Check className='w-4 h-4' />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          学会了
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <div className="text-sm text-gray-600 line-clamp-1">{item.word?.translation || '-'}</div>
                    <div className="text-xs text-gray-400">加入时间：{dayjs(item.createdAt).format('YYYY-MM-DD HH:mm:ss')}</div>
                  </div>
                )) : wrongSentenceItems.map(item => (
                  <div key={item.id} className="p-4 border rounded-lg bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-semibold text-base break-words flex-1">{item.sentence?.text || '-'}</div>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button onClick={() => handleMasterClick(item.id)} className="text-xs px-2 py-2 rounded-full bg-green-600 text-white hover:bg-green-700 cursor-pointer">
                            <Check className='w-4 h-4' />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          学会了
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <div className="text-sm text-gray-600 line-clamp-1">{item.sentence?.translation || '-'}</div>
                    <div className="text-xs text-gray-400">加入时间：{dayjs(item.createdAt).format('YYYY-MM-DD HH:mm:ss')}</div>
                  </div>
                ))}
              </div>
            )}
            {items.length > 0 &&
              <div className="flex items-center justify-center gap-4 mt-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button disabled={!hasPrev} onClick={() => hasPrev && fetchWrongWords(pagination.page - 1)} className={`px-2 py-2 rounded-full border ${hasPrev ? 'hover:bg-gray-50 cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}>
                      <ChevronLeft className='w-6 h-6' />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    上一页
                  </TooltipContent>
                </Tooltip>
                <div className="text-sm text-gray-600">{pagination.page} / {pagination.pages || 1}</div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button disabled={!hasNext} onClick={() => hasNext && fetchWrongWords(pagination.page + 1)} className={`px-2 py-2 rounded-full border ${hasNext ? 'hover:bg-gray-50 cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}>
                      <ChevronRight className='w-6 h-6' />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    下一页
                  </TooltipContent>
                </Tooltip>
              </div>
            }
          </div>
        )}
      </div>
    </div>
  );
}

export default WrongWordsComponent;
