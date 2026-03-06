'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { ScoringResult } from '@/lib/scoringCalculator';

interface HistoryRecord {
  id: string;
  finalVocab: number;
  cefrLevel: string;
  phase2CorrectRate: number;
  phase3CorrectRate: number;
  createdAt: string;
}

interface ResultDisplayProps {
  scoringResult: ScoringResult;
  onRestart: () => void;
  onBackToLanding?: () => void;
}

export default function ResultDisplay({
  scoringResult,
  onRestart,
  onBackToLanding,
}: ResultDisplayProps) {
  const router = useRouter();
  const hasSaved = useRef(false);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    // POST result — only once (ref guards against React strict mode double-invoke)
    if (!hasSaved.current) {
      hasSaved.current = true;
      fetch('/api/vocab-assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          finalVocab: scoringResult.finalVocab,
          cefrLevel: scoringResult.cefrLevel,
          phase2CorrectRate: scoringResult.anchorCorrectRate,
          phase3CorrectRate: scoringResult.aboveCorrectRate,
        }),
      })
        .then(async (res) => {
          if (!res.ok) throw new Error('保存失败');
        })
        .catch(() => {
          toast.error('测评结果保存失败，请稍后重试');
        });
    }

    // GET historical records
    fetch('/api/vocab-assessment')
      .then(async (res) => {
        if (!res.ok) throw new Error('获取历史记录失败');
        const data = await res.json();
        setHistory(data.records ?? []);
      })
      .catch(() => {
        // Silently fail — history is non-critical
      })
      .finally(() => {
        setLoadingHistory(false);
      });
  }, [scoringResult]);

  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-lg mx-auto px-4 py-8">
      {/* Current result */}
      <div className="flex flex-col items-center gap-4 w-full">
        <h2 className="text-lg text-gray-500 dark:text-gray-400">
          你的词汇量估算
        </h2>
        <span className="text-5xl font-bold text-blue-600 dark:text-blue-400">
          {scoringResult.finalVocab.toLocaleString()}
        </span>
        <span className="text-xl font-medium text-gray-700 dark:text-gray-300">
          CEFR {scoringResult.cefrLevel}
        </span>
      </div>

      {/* Action buttons */}
      <div className="flex gap-4 w-full max-w-sm">
        <button
          type="button"
          onClick={onBackToLanding || (() => router.push('/my?tab=assessment'))}
          className="flex-1 py-3 rounded-xl text-base font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors cursor-pointer"
        >
          返回
        </button>
        <button
          type="button"
          onClick={onRestart}
          className="flex-1 py-3 rounded-xl text-base font-medium bg-blue-500 text-white hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 transition-colors cursor-pointer"
        >
          重新测评
        </button>
      </div>

      {/* Historical records */}
      <div className="w-full">
        <h3 className="text-base font-medium text-gray-700 dark:text-gray-300 mb-3">
          历史记录
        </h3>

        {loadingHistory && (
          <p className="text-sm text-gray-400 dark:text-gray-500">加载中…</p>
        )}

        {!loadingHistory && history.length === 0 && (
          <p className="text-sm text-gray-400 dark:text-gray-500">
            暂无历史记录
          </p>
        )}

        {!loadingHistory && history.length > 0 && (
          <ul className="flex flex-col gap-2">
            {history.map((record) => (
              <li
                key={record.id}
                className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50 dark:bg-gray-800/50"
              >
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {new Date(record.createdAt).toLocaleDateString('zh-CN')}
                </span>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {record.finalVocab.toLocaleString()} · {record.cefrLevel}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
