'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GraduationCap, TrendingUp, Calendar, Award, Loader2, RefreshCcw, Headphones, BookOpen, ChartLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VOCAB_LEVEL_DESC } from '@/constants';
import dayjs from 'dayjs';

interface AssessmentRecord {
  id: string;
  finalVocab: number;
  cefrLevel: string;
  phase2CorrectRate: number;
  phase3CorrectRate: number;
  mode: string;
  createdAt: string;
}

// ── Dual-line sparkline chart ──────────────────────────────────────────────
function VocabSparkline({
  readingRecords,
  listeningRecords,
}: {
  readingRecords: AssessmentRecord[];
  listeningRecords: AssessmentRecord[];
}) {
  const hasReading = readingRecords.length >= 2;
  const hasListening = listeningRecords.length >= 2;
  if (!hasReading && !hasListening) return null;

  const W = 400;
  const H = 160;
  const PAD = { top: 28, right: 16, bottom: 28, left: 48 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  // Merge all dates for shared x-axis
  const allRecords = [
    ...readingRecords.map(r => ({ ...r, _mode: 'reading' as const })),
    ...listeningRecords.map(r => ({ ...r, _mode: 'listening' as const })),
  ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  // Collect unique dates for x-axis
  const allDates = Array.from(new Set(allRecords.map(r =>
    new Date(r.createdAt).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
  )));

  // Compute global min/max for shared y-axis
  const allValues = allRecords.map(r => r.finalVocab);
  const minV = Math.min(...allValues);
  const maxV = Math.max(...allValues);
  const range = maxV - minV || 1;

  const yOf = (v: number) => PAD.top + innerH - ((v - minV) / range) * innerH;

  const buildLine = (records: AssessmentRecord[]) => {
    const sorted = [...records].sort((a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    return sorted.map((r, i) => ({
      x: PAD.left + (i / Math.max(sorted.length - 1, 1)) * innerW,
      y: yOf(r.finalVocab),
      r,
    }));
  };

  const readingPts = hasReading ? buildLine(readingRecords) : [];
  const listeningPts = hasListening ? buildLine(listeningRecords) : [];

  const ticks = [minV, Math.round((minV + maxV) / 2), maxV];

  const renderLine = (
    points: { x: number; y: number; r: AssessmentRecord }[],
    color: string,
    gradId: string,
  ) => {
    if (points.length < 2) return null;
    const polyline = points.map(p => `${p.x},${p.y}`).join(' ');
    return (
      <>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.2" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <polygon
          points={`${points[0].x},${PAD.top + innerH} ${polyline} ${points[points.length - 1].x},${PAD.top + innerH}`}
          fill={`url(#${gradId})`}
        />
        <polyline points={polyline} fill="none" stroke={color} strokeWidth={2}
          strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <g key={i}>
            <text x={p.x} y={p.y - 10} textAnchor="middle" fontSize={10}
              fontWeight="600" fill={color}>
              {p.r.finalVocab >= 1000
                ? `${(p.r.finalVocab / 1000).toFixed(1)}k`
                : p.r.finalVocab}
            </text>
            <circle cx={p.x} cy={p.y} r={4} fill={color} />
            <circle cx={p.x} cy={p.y} r={2.5} fill="white" />
          </g>
        ))}
      </>
    );
  };

  // x-axis dates from the line with more points
  const xAxisPts = readingPts.length >= listeningPts.length ? readingPts : listeningPts;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ChartLine className='w-4 h-4 text-orange-400' />
          <span className='text-base font-medium text-muted-foreground'>词汇量趋势</span>
          </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          {hasReading && (
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-0.5 rounded bg-blue-500" /> 阅读
            </span>
          )}
          {hasListening && (
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-0.5 rounded bg-emerald-500" /> 听力
            </span>
          )}
        </div>
      </div>
      <div className="relative" style={{ height: H }}>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full">
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

          {renderLine(readingPts, '#3b82f6', 'readGrad')}
          {renderLine(listeningPts, '#10b981', 'listenGrad')}

          {/* x-axis dates */}
          {xAxisPts.map((p, i) => (
            <text key={i} x={p.x} y={H - 4} textAnchor="middle" fontSize={9}
              fill="currentColor" opacity={0.45}>
              {new Date(p.r.createdAt).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}
            </text>
          ))}
        </svg>
      </div>
    </div>
  );
}


// ── Result card for a single mode ──────────────────────────────────────────
function ModeResultCard({
  record,
  mode,
  onStart,
}: {
  record: AssessmentRecord | null;
  mode: 'reading' | 'listening';
  onStart: () => void;
}) {
  const isReading = mode === 'reading';
  const label = isReading ? '阅读词汇量' : '听力词汇量';
  const Icon = isReading ? BookOpen : Headphones;

  if (!record) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 flex flex-col items-center gap-3">
        <div className={isReading ? 'p-2 rounded-full bg-blue-100 dark:bg-blue-900/30' : 'p-2 rounded-full bg-emerald-100 dark:bg-emerald-900/30'}>
          <Icon className={isReading ? 'w-4 h-4 text-blue-600 dark:text-blue-400' : 'w-5 h-5 text-emerald-600 dark:text-emerald-400'} />
        </div>
        <div className="text-base font-medium text-muted-foreground">{label}</div>
        <div className="text-sm text-muted-foreground">暂无测评记录</div>
        <Button
          onClick={onStart}
          size="sm"
          className={`mt-1 cursor-pointer text-white ${isReading ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
        >
          开始测评
        </Button>
      </div>
    );
  }

  return (
    <div className=" bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-2 mb-3">
        <Icon className={isReading ? 'w-4 h-4 text-blue-600 dark:text-blue-400' : 'w-4 h-4 text-emerald-600 dark:text-emerald-400'} />
        <span className="text-base font-medium text-muted-foreground">{label}</span>
        <span className='text-sm text-gray-400'>({dayjs(record.createdAt).format('YYYY-MM-DD HH:MM')})</span>
      </div>
      <div className="flex items-end gap-2 mb-1">
        <span className={`text-4xl font-bold ${isReading ? 'text-blue-600 dark:text-blue-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
          {record.finalVocab.toLocaleString()}
        </span>
        <span className="text-sm text-muted-foreground pb-1">个单词</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {VOCAB_LEVEL_DESC?.[record.cefrLevel]?.name} - {VOCAB_LEVEL_DESC?.[record.cefrLevel]?.level}
        </span>
        <Button
          onClick={onStart}
          variant="ghost"
          size="sm"
          className="text-xs cursor-pointer bg-gray-200"
        >
          <RefreshCcw />
          重测
        </Button>
      </div>
      <div className={`text-sm text-gray-500 ${isReading ? 'bg-blue-100' : 'bg-green-100'} rounded-lg px-3 py-3 mt-4`}>
        <div>{VOCAB_LEVEL_DESC?.[record.cefrLevel]?.description}</div>
      </div>
    </div>
  );
}

// ── Main landing component ─────────────────────────────────────────────────
const VocabAssessmentLanding = () => {
  const router = useRouter();
  const [readingRecords, setReadingRecords] = useState<AssessmentRecord[]>([]);
  const [listeningRecords, setListeningRecords] = useState<AssessmentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [readRes, listenRes] = await Promise.all([
          fetch('/api/vocab-assessment?mode=reading'),
          fetch('/api/vocab-assessment?mode=listening'),
        ]);
        const [readData, listenData] = await Promise.all([readRes.json(), listenRes.json()]);
        if (readData.records) setReadingRecords(readData.records.slice(0, 7));
        if (listenData.records) setListeningRecords(listenData.records.slice(0, 7));
      } catch (error) {
        console.error('获取测评记录失败:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const latestReading = readingRecords[0] ?? null;
  const latestListening = listeningRecords[0] ?? null;
  const hasAnyRecord = latestReading || latestListening;

  const handleStart = (mode: 'reading' | 'listening') => {
    router.push(`/my/assessment?mode=${mode}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!hasAnyRecord) {
    // First time — show intro
    return (
      <div className="max-w-6xl mx-auto">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-2xl p-2 md:p-6 border border-blue-100 dark:border-blue-900/30">
          <div className="flex flex-col items-center text-center">
            <div className="p-4 rounded-full bg-blue-100 dark:bg-blue-900/30 mb-4">
              <GraduationCap className="w-12 h-12 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-2xl font-bold mb-3 text-foreground">开始你的词汇量测评</h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              通过自适应测试题，精准评估你的英语词汇量水平。支持阅读词汇量和听力词汇量两种模式。
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
            <div className="flex gap-4">
              <Button
                onClick={() => handleStart('reading')}
                size="lg"
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 cursor-pointer"
              >
                <BookOpen className="w-4 h-4 mr-2" />
                阅读词汇量
              </Button>
              <Button
                onClick={() => handleStart('listening')}
                size="lg"
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 cursor-pointer"
              >
                <Headphones className="w-4 h-4 mr-2" />
                听力词汇量
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Has records — show results
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-2xl p-2 md:p-6 border border-blue-100 dark:border-blue-900/30">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30">
            <GraduationCap className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="text-xl font-bold text-foreground">词汇量测评</h3>
        </div>

        {/* Two mode cards side by side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
          <ModeResultCard
            record={latestReading}
            mode="reading"
            onStart={() => handleStart('reading')}
          />
          <ModeResultCard
            record={latestListening}
            mode="listening"
            onStart={() => handleStart('listening')}
          />
        </div>

        {/* Dual-line chart */}
        <VocabSparkline
          readingRecords={readingRecords}
          listeningRecords={listeningRecords}
        />
      </div>
    </div>
  );
};

export default VocabAssessmentLanding;
