'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Tag,
  Gauge,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Repeat,
  GraduationCap,
  MousePointerClick,
  ArrowLeftRight,
  Lock,
  Captions,
  CaptionsOff,
  Mic,
  Square,
  Loader2,
  CirclePlay,
  Trophy,
  CornerDownLeft,
} from 'lucide-react';
import 'plyr/dist/plyr.css';
import { toast } from 'sonner';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { useVideoStudyTracker } from './hooks/useVideoStudyTracker';
import { useReadAloudRecorder, type EvalWord, type EvalLine } from './hooks/useReadAloudRecorder';
import { diffDictation, type DictationDiff } from './lib/dictationDiff';
import { getBeijingDateString } from '@/lib/timeUtils';

// ---- 类型 ----
type KeyPhrase = { phrase: string; meaning: string; type: string };
type Subtitle = {
  index: number;
  start: number;
  end: number;
  en: string;
  zh: string;
  key_phrases: KeyPhrase[];
};

type Segment =
  | { kind: 'text'; text: string }
  | { kind: 'phrase'; text: string; meaning: string; type: string };

interface VideoData {
  id: number;
  title: string;
  titleZh?: string;
  author?: string;
  description?: string;
  category: string;
  level?: string;
  duration?: number;
  tags: string[];
  coverImageUrl?: string;
  videoUrl: string;
  subtitles?: {
    subtitles?: Subtitle[];
    [key: string]: unknown;
  };
  isPro: boolean;
  publishedAt?: string;
}

// ---- 辅助函数：将英文句子按 key_phrases 切片，用于高亮/挖空 ----
function splitByKeyPhrases(text: string, keyPhrases: KeyPhrase[]): Segment[] {
  if (!keyPhrases || keyPhrases.length === 0) return [{ kind: 'text', text }];
  const sorted = [...keyPhrases].sort((a, b) => b.phrase.length - a.phrase.length);
  type Match = { start: number; end: number; phrase: KeyPhrase };
  const matches: Match[] = [];
  const used: boolean[] = new Array(text.length).fill(false);

  for (const kp of sorted) {
    if (!kp.phrase) continue;
    const re = new RegExp(kp.phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
      const s = m.index;
      const e = m.index + m[0].length;
      let overlap = false;
      for (let i = s; i < e; i++) {
        if (used[i]) { overlap = true; break; }
      }
      if (!overlap) {
        matches.push({ start: s, end: e, phrase: kp });
        for (let i = s; i < e; i++) used[i] = true;
      }
      if (m.index === re.lastIndex) re.lastIndex++;
    }
  }
  matches.sort((a, b) => a.start - b.start);

  const segs: Segment[] = [];
  let cursor = 0;
  for (const mt of matches) {
    if (mt.start > cursor) segs.push({ kind: 'text', text: text.slice(cursor, mt.start) });
    segs.push({ kind: 'phrase', text: text.slice(mt.start, mt.end), meaning: mt.phrase.meaning, type: mt.phrase.type });
    cursor = mt.end;
  }
  if (cursor < text.length) segs.push({ kind: 'text', text: text.slice(cursor) });
  return segs;
}

// ---- 关键短语气泡提示组件 ----
const PhrasePopover = ({ text, meaning }: { text: string; meaning: string }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isClicked, setIsClicked] = useState(false);
  const popoverRef = useRef<HTMLSpanElement>(null);

  const isOpen = isHovered || isClicked;

  // 点击外部关闭
  useEffect(() => {
    if (!isClicked) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsClicked(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isClicked]);

  return (
    <span
      ref={popoverRef}
      className="relative inline"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <span
        className="text-indigo-600 font-medium decoration-indigo-300 decoration-dotted underline-offset-4 underline cursor-pointer"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setIsClicked(prev => !prev);
        }}
      >
        {text}
      </span>
      {isOpen && (
        <span
          className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 z-50 pointer-events-none"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="pointer-events-auto block whitespace-nowrap rounded-lg bg-gray-900 text-white px-3 py-2 text-xs shadow-lg animate-in fade-in-0 zoom-in-95 duration-150">
            <span className="absolute left-1/2 -translate-x-1/2 bottom-full w-0 h-0 border-x-[5px] border-x-transparent border-b-[5px] border-b-gray-900" />
            <span className="block font-semibold text-[13px] text-indigo-400">{text}</span>
            <span className="block mt-0.5 text-white">{meaning}</span>
          </span>
        </span>
      )}
    </span>
  );
};

const EnglishLine = ({ text, keyPhrases, isCloze, isActive }: {
  text: string; keyPhrases: KeyPhrase[]; isCloze: boolean; isActive: boolean;
}) => {
  const segments = useMemo(() => splitByKeyPhrases(text, keyPhrases), [text, keyPhrases]);
  return (
    <span className={`${isActive ? 'text-gray-900' : 'text-gray-800'}`}>
      {segments.map((seg, idx) => {
        if (seg.kind === 'text') return <span key={idx}>{seg.text}</span>;
        if (isCloze) {
          const placeholder = seg.text.replace(/[a-zA-Z]/g, '_');
          return (
            <input key={idx} type="text" placeholder={placeholder}
              className="mx-1 inline-block min-w-[4rem] px-1 py-0.5 border-b-2 border-emerald-300 bg-emerald-50 text-center text-[13px] font-medium text-emerald-700 outline-none focus:border-emerald-600 focus:bg-emerald-100 transition-colors"
              style={{ width: `${Math.max(seg.text.length * 0.6, 4)}rem` }}
            />
          );
        }
        return (
          <PhrasePopover key={idx} text={seg.text} meaning={seg.meaning} />
        );
      })}
    </span>
  );
};

// 保留一位小数（整数直接展示）
const formatScore = (score: number) => {
  if (typeof score !== 'number' || Number.isNaN(score)) return '--';
  if (Number.isInteger(score)) return score.toString();
  return score.toFixed(1);
};

// ---- 跟读评测结果（简化版：总分 + 逐词发音着色） ----
const ShadowingResultView = ({ result, recordedUrl }: { result: { score?: number; lines?: EvalLine[] }; recordedUrl?: string }) => {
  const recAudioRef = useRef<HTMLAudioElement | null>(null);
  const [openWordIdx, setOpenWordIdx] = useState<number | null>(null);
  const line = result?.lines?.[0] as EvalLine | undefined;
  const words = (line?.words as EvalWord[] | undefined) ?? [];
  return (
    <div className="mt-2 rounded-lg border border-indigo-100 bg-indigo-50/40 p-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-gray-600">
        <span className="flex items-center gap-1 font-semibold text-indigo-700">
          <Trophy className="w-3.5 h-3.5" /> 总分 {typeof result?.score === 'number' ? Math.round(result.score) : '--'}
        </span>
        <span>准确 {formatScore(line?.pronunciation ?? 0)}</span>
        <span>流利 {formatScore(line?.fluency ?? 0)}</span>
        <span>完整 {formatScore(line?.integrity ?? 0)}</span>
        {recordedUrl && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (!recAudioRef.current) return;
              try { recAudioRef.current.currentTime = 0; recAudioRef.current.play().catch(() => {}); } catch { /* ignore */ }
            }}
            className="ml-auto p-1 rounded-full bg-emerald-500 text-white hover:bg-emerald-600 cursor-pointer"
            aria-label="回放录音"
          >
            <CirclePlay className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <div className="mt-2 text-[17px] leading-relaxed flex flex-wrap gap-x-1.5 gap-y-1">
        {words.map((w, idx) => {
          const sc = Number(w.score ?? 0);
          if (w.type === 7) return <span key={idx} className="text-gray-700">{w.text}</span>;
          const color = sc === 0 ? 'text-gray-700' : sc >= 8.5 ? 'text-emerald-600' : sc >= 6 ? 'text-yellow-500' : 'text-rose-500';
          const underline = sc > 0 ? 'underline decoration-2 underline-offset-4' : '';
          const isOpen = openWordIdx === idx;
          return (
            <Tooltip key={idx} open={isOpen}>
              <TooltipTrigger asChild>
                <span
                  className={`${color} ${underline} cursor-pointer`}
                  onPointerEnter={(e) => { if (e.pointerType === 'mouse') setOpenWordIdx(idx); }}
                  onPointerLeave={(e) => { if (e.pointerType === 'mouse') setOpenWordIdx(prev => prev === idx ? null : prev); }}
                  onClick={(e) => { e.stopPropagation(); setOpenWordIdx(prev => prev === idx ? null : idx); }}
                >
                  {w.text}
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={6} onPointerDownOutside={() => setOpenWordIdx(null)}>
                <div className="text-center">
                  <div className="font-medium">{w.text}</div>
                  {w.phonetic && <div className="text-xs text-slate-400">/{w.phonetic}/</div>}
                  <div className="text-sm font-semibold">{formatScore(sc)} 分</div>
                </div>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
      <div className="mt-2 flex items-center gap-3 text-[11px] text-gray-400">
        <span className="inline-flex items-center"><span className="w-2 h-2 bg-emerald-600 inline-block mr-1 rounded-full" />很好</span>
        <span className="inline-flex items-center"><span className="w-2 h-2 bg-yellow-500 inline-block mr-1 rounded-full" />良好</span>
        <span className="inline-flex items-center"><span className="w-2 h-2 bg-rose-500 inline-block mr-1 rounded-full" />较差</span>
      </div>
      {recordedUrl && <audio ref={recAudioRef} src={recordedUrl} preload="none" className="hidden" />}
    </div>
  );
};

// ---- 听写结果（您的输入 + 正确答案，逐词标记 正确/错误/遗漏） ----
const DictationResultView = ({ diff }: { diff: DictationDiff }) => {
  return (
    <div className="mt-3 space-y-3">
      <div>
        <div className="text-[12px] text-gray-400 mb-1">您的输入</div>
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-[15px] leading-relaxed flex flex-wrap gap-x-1.5 gap-y-1">
          {diff.inputTokens.length === 0 && <span className="text-gray-300">（未输入）</span>}
          {diff.inputTokens.map((t, idx) => (
            <span key={idx} className={t.status === 'correct' ? 'text-emerald-600' : 'text-rose-500 line-through'}>{t.text}</span>
          ))}
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[12px] text-gray-400">正确答案</span>
          <span className="flex items-center gap-3 text-[11px] text-gray-400">
            <span className="inline-flex items-center"><span className="w-2 h-2 bg-emerald-500 inline-block mr-1 rounded-full" />正确</span>
            <span className="inline-flex items-center"><span className="w-2 h-2 bg-rose-400 inline-block mr-1 rounded-full" />错误</span>
            <span className="inline-flex items-center"><span className="w-2 h-2 bg-yellow-400 inline-block mr-1 rounded-full" />遗漏</span>
          </span>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-[15px] leading-relaxed flex flex-wrap gap-x-1.5 gap-y-1">
          {diff.answerTokens.map((t, idx) => (
            <span key={idx} className={`rounded px-1 ${t.status === 'correct' ? 'bg-emerald-50 text-emerald-600' : 'bg-yellow-50 text-yellow-600'}`}>{t.text}</span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default function VideoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const videoId = params.id as string;

  const [videoData, setVideoData] = useState<VideoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [needVip, setNeedVip] = useState(false);

  const [langMode, setLangMode] = useState<'bilingual' | 'en' | 'zh'>('bilingual');
  const [studyMode, setStudyMode] = useState<'none' | 'cloze' | 'shadowing' | 'dictation'>('none');
  const isCloze = studyMode === 'cloze';
  const toggleStudyMode = useCallback((mode: 'cloze' | 'shadowing' | 'dictation') => {
    setStudyMode((prev) => (prev === mode ? 'none' : mode));
  }, []);
  const [blurSubtitles, setBlurSubtitles] = useState(false);
  const [revealedIds, setRevealedIds] = useState<Set<number>>(() => new Set());
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [loopSentence, setLoopSentence] = useState(false);
  const [autoFollow, setAutoFollow] = useState(true);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isSwapped, setIsSwapped] = useState(false);
  const [videoWidth, setVideoWidth] = useState(50); // 视频区宽度百分比（50~100），仅桌面左右布局生效
  const [isDesktop, setIsDesktop] = useState(false);

  // ---- 跟读（影子跟读评测） ----
  const readAloud = useReadAloudRecorder();
  const [dailyLimit, setDailyLimit] = useState(20);
  const [isFormalMember, setIsFormalMember] = useState(false);
  const [todayAttempts, setTodayAttempts] = useState(0);

  const refreshTodayAttempts = useCallback(() => {
    try {
      const key = `video_readaloud_attempts_${getBeijingDateString()}`;
      const map = JSON.parse(localStorage.getItem(key) || '{}') as Record<string, number>;
      setTodayAttempts(Object.values(map).reduce((sum, v) => sum + v, 0));
    } catch {
      setTodayAttempts(0);
    }
  }, []);

  const recordAttempt = useCallback((sentenceIdx: number) => {
    try {
      const key = `video_readaloud_attempts_${getBeijingDateString()}`;
      const map = JSON.parse(localStorage.getItem(key) || '{}') as Record<string, number>;
      const next = { ...map, [String(sentenceIdx)]: (map[String(sentenceIdx)] || 0) + 1 };
      localStorage.setItem(key, JSON.stringify(next));
      setTodayAttempts(Object.values(next).reduce((sum, v) => sum + v, 0));
    } catch { /* ignore */ }
  }, []);

  // ---- 听写 ----
  const [dictationOpenIdx, setDictationOpenIdx] = useState<number | null>(null);
  const [dictationInput, setDictationInput] = useState('');
  const [dictationResults, setDictationResults] = useState<Record<number, DictationDiff>>({});

  // 获取跟读每日限额
  useEffect(() => {
    fetch('/api/video/read-aloud-quota')
      .then((res) => res.json())
      .then((data) => {
        if (typeof data?.dailyLimit === 'number') setDailyLimit(data.dailyLimit);
        if (typeof data?.isFormal === 'boolean') setIsFormalMember(data.isFormal);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    refreshTodayAttempts();
  }, [refreshTodayAttempts]);

  // 离开听写模式时，清除「播放一句后暂停」的目标，避免影响其它模式
  useEffect(() => {
    if (studyMode !== 'dictation') dictationStopAtRef.current = null;
  }, [studyMode]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const plyrRef = useRef<import('plyr').default | null>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const activeItemRef = useRef<HTMLDivElement>(null);
  const isUserScrolling = useRef(false);
  const scrollTimer = useRef<NodeJS.Timeout | null>(null);
  const layoutRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  // 听写模式下「播放一句后自动暂停」的目标句子索引（一次性）
  const dictationStopAtRef = useRef<number | null>(null);

  // 视听演练学习时长追踪
  useVideoStudyTracker({ videoId: videoData?.id ?? null, videoRef });

  // 加载视频数据
  useEffect(() => {
    if (!videoId) return;
    setLoading(true);
    setNeedVip(false);
    setError('');
    fetch(`/api/video?id=${videoId}`)
      .then(async (res) => {
        const data = await res.json();
        return { res, data };
      })
      .then(({ res, data }) => {
        if (!res.ok) {
          if (res.status === 403) {
            setNeedVip(true);
            setError(data.error || '需购买会员才能查看该视频');
            return;
          }
          setError(data.error || '加载失败');
          return;
        }
        if (data.success) {
          setVideoData(data.data);
        } else {
          setError(data.error || '加载失败');
        }
      })
      .catch(() => setError('加载失败'))
      .finally(() => setLoading(false));
  }, [videoId]);

  const transcript = useMemo(() => {
    const subtitlesRaw = videoData?.subtitles?.subtitles;
    return ((subtitlesRaw ?? []) as Subtitle[]).filter((s) => s.end - s.start > 0.2);
  }, [videoData?.subtitles?.subtitles]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const formatDate = (iso?: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
  };

  const findActiveIndex = useCallback(
    (time: number) => {
      for (let i = 0; i < transcript.length; i++) {
        if (time >= transcript[i].start && time < transcript[i].end) return i;
      }
      return -1;
    },
    [transcript]
  );

  // 初始化 Plyr
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoData) return;
    let cancelled = false;
    (async () => {
      try {
        // 路由切换时先销毁旧实例，避免第二个视频复用到脏状态。
        if (plyrRef.current) {
          try { plyrRef.current.destroy(); } catch { /* ignore */ }
          plyrRef.current = null;
        }
        if (video.readyState === 0) video.load();
        const Plyr = (await import('plyr')).default;
        if (cancelled) return;
        const player = new Plyr(video, {
          controls: ['play-large', 'play', 'progress', 'current-time', 'duration', 'mute', 'volume', 'captions', 'settings', 'pip', 'airplay', 'fullscreen'],
          settings: ['captions', 'quality', 'speed'],
          speed: { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 2] },
          keyboard: { focused: true, global: false },
          tooltips: { controls: true, seek: true },
          ratio: '16:9',
        });
        plyrRef.current = player;
      } catch {
        // Plyr 初始化失败时回退到原生控件，避免首屏无播放入口。
        video.controls = true;
      }
    })();
    return () => {
      cancelled = true;
      try { plyrRef.current?.destroy(); } catch { /* ignore */ }
      plyrRef.current = null;
    };
  }, [videoData]);

  // 切换视频时重置播放态，避免沿用上一个视频的状态。
  useEffect(() => {
    setIsPlaying(false);
    setActiveIndex(-1);
  }, [videoData?.id]);

  // 视频时间更新 → 同步字幕
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoData) return;
    let rafId: number;
    const tick = () => {
      const t = video.currentTime;
      const idx = findActiveIndex(t);
      setActiveIndex(idx);
      if (loopSentence && idx >= 0) {
        const item = transcript[idx];
        if (t >= item.end - 0.05) video.currentTime = item.start;
      } else if (dictationStopAtRef.current != null) {
        // 听写：播放完目标句子后自动暂停（一次性）
        const target = transcript[dictationStopAtRef.current];
        if (target && t >= target.end - 0.03) {
          video.pause();
          dictationStopAtRef.current = null;
        }
      }
      rafId = requestAnimationFrame(tick);
    };
    const onPlay = () => { setIsPlaying(true); rafId = requestAnimationFrame(tick); };
    const onPause = () => { setIsPlaying(false); cancelAnimationFrame(rafId); };
    const onSeeked = () => { setActiveIndex(findActiveIndex(video.currentTime)); };
    if (!video.paused) rafId = requestAnimationFrame(tick);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('seeked', onSeeked);
    return () => {
      cancelAnimationFrame(rafId);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('seeked', onSeeked);
    };
  }, [findActiveIndex, loopSentence, transcript, videoData]);

  useEffect(() => {
    if (!autoFollow || isUserScrolling.current) return;
    if (!activeItemRef.current || !transcriptRef.current) return;
    activeItemRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [activeIndex, autoFollow]);

  useEffect(() => {
    const container = transcriptRef.current;
    if (!container) return;
    const onScroll = () => {
      isUserScrolling.current = true;
      if (scrollTimer.current) clearTimeout(scrollTimer.current);
      scrollTimer.current = setTimeout(() => { isUserScrolling.current = false; }, 2000);
    };
    container.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', onScroll);
      if (scrollTimer.current) clearTimeout(scrollTimer.current);
    };
  }, []);

  // 监听是否为桌面端（左右布局），仅桌面端启用宽度拖拽
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const onResize = useCallback((e: PointerEvent) => {
    const container = layoutRef.current;
    if (!isDraggingRef.current || !container) return;
    const rect = container.getBoundingClientRect();
    let pct = isSwapped
      ? ((rect.right - e.clientX) / rect.width) * 100
      : ((e.clientX - rect.left) / rect.width) * 100;
    pct = Math.max(50, Math.min(100, pct));
    setVideoWidth(pct);
  }, [isSwapped]);

  const stopResize = useCallback(() => {
    isDraggingRef.current = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    window.removeEventListener('pointermove', onResize);
    window.removeEventListener('pointerup', stopResize);
  }, [onResize]);

  const startResize = useCallback((e: React.PointerEvent) => {
    if (!isDesktop) return;
    e.preventDefault();
    isDraggingRef.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('pointermove', onResize);
    window.addEventListener('pointerup', stopResize);
  }, [isDesktop, onResize, stopResize]);

  // 卸载时清理可能残留的监听
  useEffect(() => () => stopResize(), [stopResize]);

  const playVideo = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      // 首次进入时可能 metadata 尚未就绪，先触发加载再尝试播放。
      if (video.readyState === 0) video.load();
      await video.play();
    } catch {
      // 某些浏览器在资源刚挂载时会短暂拒绝 play，下一次可播放后自动重试一次。
      const retry = () => {
        void video.play().catch(() => { /* ignore */ });
      };
      video.addEventListener('canplay', retry, { once: true });
    }
  }, []);

  const seekTo = useCallback((time: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = time;
    setActiveIndex(findActiveIndex(time));
    if (!isPlaying) void playVideo();
  }, [findActiveIndex, isPlaying, playVideo]);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      void playVideo();
    } else {
      video.pause();
    }
  }, [playVideo]);

  // 桌面端空格键播放/暂停（避开输入框与 Plyr 自身键盘处理）
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!isDesktop) return;
      if (e.repeat || e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.code !== 'Space' && e.key !== ' ') return;

      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (target.isContentEditable || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        // 在 Plyr 控件聚焦时，让 Plyr 自己处理键盘行为，避免双触发。
        if (target.closest('.plyr')) return;
      }

      e.preventDefault();
      togglePlay();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isDesktop, togglePlay]);

  const jumpSentence = (delta: number) => {
    if (transcript.length === 0) return;
    const base = activeIndex >= 0 ? activeIndex : 0;
    const target = Math.max(0, Math.min(transcript.length - 1, base + delta));
    seekTo(transcript[target].start);
  };

  const cycleRate = () => {
    const rates = [0.5, 0.75, 1, 1.25, 1.5, 2];
    const next = rates[(rates.indexOf(playbackRate) + 1) % rates.length];
    setPlaybackRate(next);
    if (videoRef.current) videoRef.current.playbackRate = next;
  };

  // 开始/停止某句跟读：高亮并暂停在该句（不播放朗读），随后开始录音
  // 含每日限额检查，超额 toast 提示，结果不落库
  const handleReadAloudClick = useCallback((idx: number, item: Subtitle) => {
    if (readAloud.recordingIdx === idx) {
      readAloud.stop();
      return;
    }
    if (readAloud.recordingIdx !== null || readAloud.evaluatingIdx !== null) return;
    if (todayAttempts >= dailyLimit) {
      toast.error(
        isFormalMember
          ? `今日跟读次数已达上限（${dailyLimit} 次），请明天再来`
          : `今日跟读次数已用完（${dailyLimit} 次），开通正式会员可享每天 200 次`
      );
      return;
    }
    // 高亮并暂停在该句，不播放朗读
    const video = videoRef.current;
    if (video) {
      try { video.pause(); video.currentTime = item.start; } catch { /* ignore */ }
    }
    setActiveIndex(idx);
    const durationSec = Math.max(6, Math.ceil((item.end - item.start) + 3));
    void readAloud.start(idx, item.en, durationSec).then((ok) => {
      if (ok) recordAttempt(idx);
    });
  }, [readAloud, todayAttempts, dailyLimit, isFormalMember, recordAttempt]);

  // 听写：播放某句并在该句结束后自动暂停
  const playSentenceForDictation = useCallback((idx: number) => {
    const item = transcript[idx];
    if (!item) return;
    dictationStopAtRef.current = idx;
    seekTo(item.start);
  }, [transcript, seekTo]);

  // 打开某句听写输入（清空输入缓冲，定位并播放该句，播完自动暂停）
  const openDictation = useCallback((idx: number) => {
    setDictationOpenIdx(idx);
    setDictationInput('');
    playSentenceForDictation(idx);
  }, [playSentenceForDictation]);

  // 提交听写：比对用户输入与正确答案，结果不落库
  const submitDictation = useCallback((idx: number, answer: string) => {
    if (!dictationInput.trim()) return;
    const diff = diffDictation(dictationInput, answer);
    setDictationResults((prev) => ({ ...prev, [idx]: diff }));
  }, [dictationInput]);

  const currentItem = activeIndex >= 0 ? transcript[activeIndex] : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  if (error || !videoData) {
    if (needVip) {
      return (
        <div className="flex items-center justify-center h-screen bg-gray-50 px-4">
          <div className="w-full max-w-md bg-white border border-gray-100 rounded-2xl shadow-sm p-6 text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center">
              <Lock className="w-5 h-5 text-amber-500" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-gray-900">会员专属视频</h2>
            <p className="mt-2 text-sm text-gray-500">
              {error || '需购买会员才能查看该视频'}
            </p>
            <div className="mt-5 flex items-center justify-center gap-3">
              <button
                onClick={() => router.push('/video')}
                className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition cursor-pointer"
              >
                返回列表
              </button>
              <button
                onClick={() => router.push('/vip')}
                className="px-4 py-2 rounded-lg bg-orange-500 text-white text-sm hover:bg-orange-600 transition cursor-pointer"
              >
                开通会员
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <div className="text-gray-500">{error || '视频不存在'}</div>
        <button onClick={() => router.push('/video')} className="text-indigo-600 hover:underline">返回视频列表</button>
      </div>
    );
  }

  return (
    <div ref={layoutRef} className={`relative flex flex-col h-screen bg-gray-50 text-gray-800 font-sans overflow-hidden ${isSwapped ? 'lg:flex-row-reverse' : 'lg:flex-row'}`}>
      {/* ===== 左侧：视频播放区域 ===== */}
      <div
        className="w-full flex flex-col bg-white shadow-sm z-10 relative shrink-0 lg:flex-none min-w-0"
        style={isDesktop ? { width: `calc(${videoWidth}% - 3px)` } : undefined}
      >
        {/* 顶部标题区 */}
        <div className="px-2 lg:px-5 pt-4 pb-3 border-b border-gray-100">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1 flex gap-2 items-center">
              <ChevronLeft onClick={() => router.push('/video')} className="font-light w-8 h-8 md:w-10 md:h-10 lg:w-12 lg:h-12 -ml-2 md:-ml-4 cursor-pointer" />
              <div className="min-w-0">
                <h1 className="text-sm md:text-base lg:text-lg font-bold text-gray-900 truncate">{videoData.title}</h1>
                <p className="text-[10px] md:text-xs lg:text-xs text-gray-500 mt-1 truncate">
                  {videoData.titleZh}
                  {videoData.author && <span className="text-gray-400"> · {videoData.author}</span>}
                </p>
              </div>
            </div>
            <div className="lg:flex hidden items-center gap-2 shrink-0 mt-0.5">
              {videoData.isPro && (
                <span className="text-[11px] bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full text-amber-600 font-medium flex items-center gap-1">
                  <Lock className="w-3 h-3" /> 会员
                </span>
              )}
              {videoData.level && (
                <span className="text-[11px] bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-full text-gray-600 font-medium">{videoData.level}</span>
              )}
              {videoData.publishedAt && (
                <span className="text-[11px] text-gray-400">发布于 {formatDate(videoData.publishedAt)}</span>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button onClick={() => setIsSwapped((v) => !v)} className="p-1 cursor-pointer rounded-md text-gray-400 hover:text-indigo-600 hover:bg-gray-100 transition" aria-label="切换左右布局">
                    <ArrowLeftRight className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="left">
                  {isSwapped ? '还原左右布局' : '切换左右布局'}
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
          {videoData.tags.length > 0 && (
            <div className="items-center gap-1.5 mt-2.5 flex-wrap lg:flex hidden">
              <Tag className="w-3.5 h-3.5 text-gray-400" />
              {videoData.tags.slice(0, 6).map((t) => (
                <span key={t} className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100">{t}</span>
              ))}
            </div>
          )}
        </div>

        {/* 视频 */}
        <div className="w-full bg-black plyr-wrapper" style={{ ['--plyr-color-main' as string]: '#4f46e5', ['--plyr-video-background' as string]: '#000' } as React.CSSProperties}>
          <video key={videoData.id} ref={videoRef} className="w-full aspect-video" playsInline preload="metadata" poster={videoData.coverImageUrl || undefined}>
            <source src={videoData.videoUrl} type="video/mp4" />
          </video>
        </div>

        {/* 底部交互区 */}
        <div className="flex-1 px-4 py-4 hidden lg:flex flex-col justify-between items-center bg-gray-50/60 min-h-0">
          <div className="flex-1 w-full flex flex-col items-center justify-center min-h-[4rem]">
            {studyMode === 'dictation' ? (
              dictationOpenIdx !== null && transcript[dictationOpenIdx] ? (
                <div className="w-full max-w-2xl">
                  <div className="flex items-center justify-between mb-2 text-[12px] text-gray-400">
                    <span>第 {dictationOpenIdx + 1} / {transcript.length} 句</span>
                  </div>
                  <div className="flex items-end gap-2">
                    <textarea
                      key={`dict-${dictationOpenIdx}`}
                      autoFocus
                      rows={2}
                      value={dictationInput}
                      onChange={(e) => setDictationInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          submitDictation(dictationOpenIdx, transcript[dictationOpenIdx].en);
                        }
                      }}
                      placeholder="开始听写吧…（回车提交）"
                      className="flex-1 resize-none rounded-lg border border-gray-200 px-3 py-2 text-[15px] outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200"
                    />
                    <div className='flex flex-col justify-between h-[62px]'>
                      <button onClick={() => playSentenceForDictation(dictationOpenIdx)} className="shrink-0 flex items-center gap-1 text-indigo-600 border border-indigo-500 px-2 py-1 rounded-full text-xs hover:text-indigo-700 cursor-pointer">
                      <Play className="w-3.5 h-3.5" /> 重听
                    </button>
                    <button
                      onClick={() => submitDictation(dictationOpenIdx, transcript[dictationOpenIdx].en)}
                      className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-full bg-indigo-600 text-white text-xs hover:bg-indigo-700 cursor-pointer"
                    >
                      <CornerDownLeft className="w-3.5 h-3.5" /> 提交
                    </button>
                    </div>
                  </div>
                  {dictationResults[dictationOpenIdx] && (
                    <>
                      <div className="mt-1 text-right text-[12px] font-medium text-indigo-600">
                        正确率 {dictationResults[dictationOpenIdx].accuracy}%（{dictationResults[dictationOpenIdx].correctCount}/{dictationResults[dictationOpenIdx].total}）
                      </div>
                      <DictationResultView diff={dictationResults[dictationOpenIdx]} />
                    </>
                  )}
                </div>
              ) : (
                <p className="text-gray-400 text-base">点击右侧任一句子开始听写</p>
              )
            ) : currentItem ? (
              <>
                <p className="text-center text-[22px] md:text-[24px] font-medium leading-relaxed">
                  <EnglishLine text={currentItem.en} keyPhrases={currentItem.key_phrases} isCloze={false} isActive={true} />
                </p>
                {currentItem.zh && <p className="text-center text-lg text-gray-600 mt-2">{currentItem.zh}</p>}
              </>
            ) : (
              <>
                <p className="text-gray-500 text-base">暂无字幕</p>
                <p className="text-gray-400 text-xs mt-1">当前时间点未匹配到字幕内容。</p>
              </>
            )}
          </div>
          <div className="flex items-end gap-2 md:gap-6 text-gray-500 text-[11px] mt-3 overflow-x-auto max-w-full">
            <CtrlButton label={`${playbackRate}x`} text="倍速" onClick={cycleRate} icon={<Gauge className="w-4 h-4" />} />
            <CtrlButton label="" text="单句循环" active={loopSentence} onClick={() => setLoopSentence((v) => !v)} icon={<Repeat className="w-4 h-4" />} />
            <CtrlButton label="" text="上一句" onClick={() => jumpSentence(-1)} icon={<ChevronLeft className="w-4 h-4" />} />
            <div className="flex flex-col items-center gap-2">
              <button onClick={togglePlay} className="w-12 h-12 cursor-pointer bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-md hover:bg-indigo-700 transition shrink-0" aria-label={isPlaying ? '暂停' : '播放'}>
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 translate-x-0.5" />}
              </button>
              <span className="text-xs">{isPlaying ? '暂停' : '播放'}</span>
            </div>
            <CtrlButton label="" text="下一句" onClick={() => jumpSentence(1)} icon={<ChevronRight className="w-4 h-4" />} />
            <CtrlButton label="" text="练习模式" active={isCloze} onClick={() => toggleStudyMode('cloze')} icon={<GraduationCap className="w-4 h-4" />} />
            <CtrlButton label="" text="自动跟随" active={autoFollow} onClick={() => setAutoFollow((v) => !v)} icon={<MousePointerClick className="w-4 h-4" />} />
          </div>
        </div>
      </div>

      {/* ===== 中间：可拖拽分界线（仅桌面左右布局） ===== */}
      {
        isDesktop && videoWidth < 99.5 &&
        <div
          onPointerDown={startResize}
          onDoubleClick={() => setVideoWidth(50)}
          title="拖拽调整宽度，双击还原 1:1"
          className="hidden lg:flex z-10 shrink-0 grow-0 w-1.5 cursor-col-resize group relative items-center justify-center bg-gray-100 hover:bg-indigo-100 transition-colors"
          style={{ touchAction: 'none' }}
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-12 left-1/2 -translate-x-1/2 flex items-center gap-0.5 rounded-full border border-gray-200 bg-white/90 px-1.5 py-1 text-gray-400 shadow-sm backdrop-blur-sm transition-colors group-hover:border-indigo-200 group-hover:text-indigo-500"
          >
            <ChevronLeft className="w-3 h-3" />
            <ChevronRight className="w-3 h-3" />
          </div>
          <div className="w-0.5 h-8 rounded-full bg-gray-300 group-hover:bg-indigo-400 transition-colors" />
        </div>
      }

      {/* 视频占满 100% 时的还原箭头 */}
      {isDesktop && videoWidth >= 99.5 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setVideoWidth(50)}
              aria-label="还原 1:1 布局"
              className={`hidden lg:flex absolute top-18 -translate-y-1/2 z-30 w-7 h-12 items-center justify-center rounded-l-lg rounded-r-none bg-indigo-600 text-white shadow-md hover:bg-indigo-700 transition cursor-pointer ${isSwapped ? 'left-0 rounded-l-none rounded-r-lg' : 'right-0'}`}
            >
              {isSwapped ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </TooltipTrigger>
          <TooltipContent side="left">
            点击还原 1:1 比例
          </TooltipContent>
        </Tooltip>
      )}

      {/* ===== 右侧：字幕交互区域 ===== */}
      <div
        className={`w-full flex flex-col flex-1 min-h-0 lg:flex-none lg:h-full bg-white relative min-w-0 overflow-hidden ${isSwapped ? 'lg:border-r border-gray-100' : 'lg:border-l border-gray-100'}`}
        style={isDesktop ? { width: `calc(${100 - videoWidth}% - 3px)` } : undefined}
      >
        <div className="flex items-center justify-between px-2 lg:px-4 py-3 border-b border-gray-100 shadow-sm shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex bg-gray-100 p-0.5 rounded-full text-xs sm:text-sm font-medium border border-gray-200">
              {([{ id: 'bilingual', label: '双语' }, { id: 'en', label: '英' }, { id: 'zh', label: '中' }] as const).map((mode) => (
                <button key={mode.id} onClick={() => setLangMode(mode.id)}
                  className={`px-3.5 py-1 rounded-full transition-all duration-200 ${langMode === mode.id ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
                  {mode.label}
                </button>
              ))}
            </div>
            {([{ id: 'shadowing', label: '跟读' }, { id: 'dictation', label: '听写' }, { id: 'cloze', label: '挖空' }] as const).map((m) => (
              <button key={m.id} onClick={() => toggleStudyMode(m.id)}
                className={`px-3.5 py-1 rounded-full text-xs sm:text-sm font-medium transition-colors cursor-pointer border ${studyMode === m.id ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                {m.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 text-gray-400 shrink-0">
            {studyMode === 'shadowing' && (
              <span className={`text-[11px] whitespace-nowrap ${todayAttempts >= dailyLimit ? 'text-rose-400' : 'text-gray-400'}`}>
                今日跟读 {todayAttempts}/{dailyLimit}
              </span>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <button onClick={() => { setBlurSubtitles((v) => { const next = !v; if (next) setRevealedIds(new Set()); return next; }); }}
                  className={`p-1.5 rounded-full transition cursor-pointer ${blurSubtitles ? 'bg-indigo-500 text-white' : 'text-gray-400 hover:bg-gray-100 hover:text-indigo-600'}`}>
                  {blurSubtitles ? <Captions className="w-5 h-5" /> : <CaptionsOff className="w-5 h-5" />}
                </button>
              </TooltipTrigger>
              <TooltipContent side="left">
                {blurSubtitles ? '显示字幕' : '隐藏字幕（点击单条可查看）'}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        <div ref={transcriptRef} className="flex-1 overflow-y-auto px-2 md:px-4 py-4 space-y-1 pb-24">
          {transcript.length === 0 && (
            <div className="flex items-center justify-center h-full text-gray-400">暂无字幕数据</div>
          )}
          {transcript.map((item, index) => {
            const isActive = index === activeIndex;
            const isRevealed = revealedIds.has(item.index);
            const isHidden = blurSubtitles && !isRevealed && studyMode !== 'dictation';
            const dictationAnswered = !!dictationResults[index];
            const isDictating = studyMode === 'dictation';
            const isDictationOpen = isDictating && dictationOpenIdx === index;
            // 听写模式下始终隐藏原文，作答后由结果区展示「正确答案」
            const hideForDictation = isDictating;
            const shadowResult = readAloud.results[index];
            const isRecording = readAloud.recordingIdx === index;
            const isEvaluating = readAloud.evaluatingIdx === index;
            return (
              <div key={item.index} ref={isActive ? activeItemRef : undefined}
                onClick={() => {
                  if (isDictating) {
                    if (isDictationOpen) { playSentenceForDictation(index); }
                    else { openDictation(index); }
                    return;
                  }
                  if (isHidden) { setRevealedIds((prev) => { const next = new Set(prev); next.add(item.index); return next; }); return; }
                  seekTo(item.start);
                }}
                className={`relative px-2 py-3 cursor-pointer transition-all duration-300 group rounded-md border ${isActive || isDictationOpen ? 'border-indigo-600 bg-indigo-50/50' : 'border-transparent hover:bg-gray-50'}`}>
                <div className="flex items-center justify-between text-[11px] font-mono text-gray-400 mb-1.5">
                  <span>{formatTime(item.start)} → {formatTime(item.end)}</span>
                  {studyMode === 'shadowing' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleReadAloudClick(index, item); }}
                      disabled={isEvaluating || (readAloud.recordingIdx !== null && !isRecording) || (readAloud.evaluatingIdx !== null && !isEvaluating)}
                      className={`flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-sans transition-colors cursor-pointer disabled:opacity-40 ${isRecording ? 'bg-rose-500 text-white' : 'bg-white text-indigo-600 border border-indigo-200 hover:bg-indigo-50'}`}
                      aria-label="跟读"
                    >
                      {isEvaluating ? (
                        <><Loader2 className="w-3.5 h-3.5 animate-spin" /> 评测中</>
                      ) : isRecording ? (
                        <><Square className="w-3 h-3 fill-current" /> {readAloud.countdown}s</>
                      ) : (
                        <><Mic className="w-3.5 h-3.5" /> 跟读</>
                      )}
                    </button>
                  )}
                </div>
                <div className={`transition-[filter,opacity] duration-200 ${isHidden ? 'blur-[5px] select-none opacity-80 pointer-events-none' : ''}`} aria-hidden={isHidden}>
                  {hideForDictation ? (
                    dictationAnswered ? (
                      <div className="text-[14px] text-gray-500 py-0.5">{item.zh || '\u00A0'}</div>
                    ) : (
                      <div className="flex items-center gap-2 text-[14px] text-gray-400 py-1">
                        <Play className="w-4 h-4 text-indigo-400" />
                        {isDictationOpen ? '请听写你听到的内容' : '点击播放并开始听写'}
                      </div>
                    )
                  ) : (
                    <>
                      {(langMode === 'bilingual' || langMode === 'en') && (
                        <div className={`${isActive ? 'text-[22px] font-bold' : 'font-normal text-[18px]'} mb-1`}><EnglishLine text={item.en} keyPhrases={item.key_phrases} isCloze={isCloze} isActive={isActive} /></div>
                      )}
                      {(langMode === 'bilingual' || langMode === 'zh') && (
                        <div className={`${isActive ? 'text-[18px]' : 'text-[16px]'} mt-1 ${isActive ? 'text-gray-600' : 'text-gray-400'}`}>{item.zh || '\u00A0'}</div>
                      )}
                    </>
                  )}
                </div>

                {/* 听写输入框 + 结果（移动端：内联在句子中；PC端：在视频下方） */}
                {isDictationOpen && !isDesktop && (
                  <div className="mt-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-end gap-2">
                      <textarea
                        autoFocus
                        rows={2}
                        value={dictationInput}
                        onChange={(e) => setDictationInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            submitDictation(index, item.en);
                          }
                        }}
                        placeholder="开始听写吧…（回车提交）"
                        className="flex-1 resize-none rounded-lg border border-gray-200 px-3 py-2 text-[15px] outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200"
                      />
                      <button
                        onClick={() => submitDictation(index, item.en)}
                        className="shrink-0 flex items-center gap-1 px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-700 cursor-pointer"
                      >
                        <CornerDownLeft className="w-4 h-4" /> 提交
                      </button>
                    </div>
                    {dictationResults[index] && (
                      <div className="mt-1 text-right text-[12px] font-medium text-indigo-600">
                        正确率 {dictationResults[index].accuracy}%（{dictationResults[index].correctCount}/{dictationResults[index].total}）
                      </div>
                    )}
                  </div>
                )}
                {dictationResults[index] && !isDesktop && (
                  <div onClick={(e) => e.stopPropagation()}>
                    <DictationResultView diff={dictationResults[index]} />
                  </div>
                )}

                {/* 跟读评测结果：仅展示当前高亮句子的结果，句子不再高亮则随之消失 */}
                {studyMode === 'shadowing' && isActive && shadowResult && (
                  <div onClick={(e) => e.stopPropagation()}>
                    <ShadowingResultView result={shadowResult} recordedUrl={readAloud.recordedUrls[index]} />
                  </div>
                )}

                {isHidden && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-end pr-3">
                    <span className="text-[11px] text-gray-400 bg-white/60 backdrop-blur-sm px-2 py-0.5 rounded-full border border-gray-100">点击查看</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function CtrlButton({ label, text, onClick, icon, active }: {
  label: string; text: string; onClick: () => void; icon: React.ReactNode; active?: boolean;
}) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1 shrink-0 group cursor-pointer">
      <span className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors border ${active ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white text-gray-500 border-gray-200 group-hover:text-indigo-600 group-hover:border-indigo-200'}`}>
        {label ? <span className="text-[11px] font-mono font-semibold">{label}</span> : icon}
      </span>
      <span className={`text-[11px] ${active ? 'text-indigo-600 font-medium' : 'text-gray-500 group-hover:text-indigo-600'}`}>{text}</span>
    </button>
  );
}
