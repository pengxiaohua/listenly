'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GraduationCap, TrendingUp, Calendar, Award, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VOCAB_LEVEL_DESC } from '@/constants';

interface AssessmentRecord {
  id: string;
  finalVocab: number;
  cefrLevel: string;
  phase2CorrectRate: number;
  phase3CorrectRate: number;
  createdAt: string;
}

// ── Inline sparkline chart (no external deps) ──────────────────────────────
function VocabSparkline({ records }: { records: AssessmentRecord[] }) {
  if (records.length < 2) return null;

  const W = 400;
  const H = 140;
  // extra top padding to fit the label above each dot
  const PAD = { top: 28, right: 16, bottom: 28, left: 48 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const sorted = [...records].reverse();
  const values = sorted.map(r => r.finalVocab);
  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const range = maxV - minV || 1;

  const xOf = (i: number) => PAD.left + (i / (sorted.length - 1)) * innerW;
  const yOf = (v: number) => PAD.top + innerH - ((v - minV) / range) * innerH;

  const points = sorted.map((r, i) => ({ x: xOf(i), y: yOf(r.finalVocab), r }));
  const polyline = points.map(p => `${p.x},${p.y}`).join(' ');
  const ticks = [minV, Math.round((minV + maxV) / 2), maxV];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
      <div className="text-sm font-medium text-muted-foreground mb-3">最近 {sorted.length} 次词汇量趋势</div>
      <div className="relative" style={{ height: H }}>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full">
          <defs>
            <linearGradient id="vocabGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {ticks.map(t => (
            <line key={t} x1={PAD.left} y1={yOf(t)} x2={W - PAD.right} y2={yOf(t)}
              stroke="currentColor" strokeOpacity={0.08} strokeWidth={1} />
          ))}
          {ticks.map(t => (
            <text key={t} x={PAD.left - 6} y={yOf(t) + 4} textAnchor="end" fontSize={10}
              fill="currentColor" opacity={0.45}>
              {t >= 1000 ? `${(t / 1000).toFixed(1)}k` : t}
            </text>
          ))}

          <polygon
            points={`${PAD.left},${PAD.top + innerH} ${polyline} ${W - PAD.right},${PAD.top + innerH}`}
            fill="url(#vocabGrad)"
          />
          <polyline points={polyline} fill="none" stroke="#3b82f6" strokeWidth={2}
            strokeLinejoin="round" strokeLinecap="round" />

          {points.map((p, i) => (
            <g key={i}>
              {/* value label above the dot */}
              <text x={p.x} y={p.y - 10} textAnchor="middle" fontSize={10}
                fontWeight="600" fill="#3b82f6">
                {p.r.finalVocab.toLocaleString()}
              </text>
              {/* dot */}
              <circle cx={p.x} cy={p.y} r={4} fill="#3b82f6" />
              <circle cx={p.x} cy={p.y} r={2.5} fill="white" />
              {/* x-axis date */}
              <text x={p.x} y={H - 4} textAnchor="middle" fontSize={9}
                fill="currentColor" opacity={0.45}>
                {new Date(p.r.createdAt).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

const VocabAssessmentLanding = () => {
  const router = useRouter();
  const [records, setRecords] = useState<AssessmentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecords = async () => {
      try {
        const res = await fetch('/api/vocab-assessment');
        const data = await res.json();
        if (data.records && data.records.length > 0) {
          setRecords(data.records.slice(0, 7));
        }
      } catch (error) {
        console.error('获取测评记录失败:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchRecords();
  }, []);

  const latestRecord = records[0] ?? null;

  const handleStartTest = () => {
    router.push('/my/assessment');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!latestRecord) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-2xl p-8 border border-blue-100 dark:border-blue-900/30">
          <div className="flex flex-col items-center text-center">
            <div className="p-4 rounded-full bg-blue-100 dark:bg-blue-900/30 mb-4">
              <GraduationCap className="w-12 h-12 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-2xl font-bold mb-3 text-foreground">开始你的词汇量测评</h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              通过 50 道自适应测试题，我们将精准评估你的英语词汇量水平，帮助你了解自己的真实水平。
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full mb-8">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1">50</div>
                <div className="text-sm text-muted-foreground">测试题目</div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1">3~6</div>
                <div className="text-sm text-muted-foreground">分钟完成</div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1">A1-C2</div>
                <div className="text-sm text-muted-foreground">CEFR 等级</div>
              </div>
            </div>
            <Button
              onClick={handleStartTest}
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 cursor-pointer"
            >
              开始测评
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-2xl p-8 border border-blue-100 dark:border-blue-900/30">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30">
              <GraduationCap className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground">你的词汇量</h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>{formatDate(latestRecord.createdAt)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className='bg-green-100 w-full text-sm text-gray-500 py-3 px-5 rounded-xl mb-3'>
          {VOCAB_LEVEL_DESC?.[latestRecord.cefrLevel]?.description}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-muted-foreground">词汇量</span>
            </div>
            <div className='flex items-end gap-2'>
              <div className="text-5xl font-bold text-blue-600 dark:text-blue-400">
                {latestRecord.finalVocab.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground mt-1">个单词</div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl py-6 px-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <Award className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span className="text-sm font-medium text-muted-foreground">CEFR 等级</span>
            </div>
            <div className='flex items-end gap-2'>
              <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                {VOCAB_LEVEL_DESC?.[latestRecord.cefrLevel]?.name}
              </div>
              <div className="text-sm text-muted-foreground mt-1">欧洲语言标准</div>
            </div>
          </div>
        </div>

        <VocabSparkline records={records} />

        <Button
          onClick={handleStartTest}
          size="lg"
          className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
        >
          重新测试
        </Button>
      </div>
    </div>
  );
};

export default VocabAssessmentLanding;
