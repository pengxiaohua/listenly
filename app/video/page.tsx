'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Tag,
  Gauge,
  Repeat2,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Repeat,
  GraduationCap,
  List as ListIcon,
  MousePointerClick,
  Eye,
  EyeOff,
  ArrowLeftRight,
} from 'lucide-react';
import videoData from '@/constants/data.json';
import 'plyr/dist/plyr.css';
import { cn } from '@/lib/utils';

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

// ---- 辅助函数：将英文句子按 key_phrases 切片，用于高亮/挖空 ----
function splitByKeyPhrases(text: string, keyPhrases: KeyPhrase[]): Segment[] {
  if (!keyPhrases || keyPhrases.length === 0) return [{ kind: 'text', text }];

  // 按长度降序优先匹配更长的短语，避免子串命中
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
        if (used[i]) {
          overlap = true;
          break;
        }
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
    if (mt.start > cursor) {
      segs.push({ kind: 'text', text: text.slice(cursor, mt.start) });
    }
    segs.push({
      kind: 'phrase',
      text: text.slice(mt.start, mt.end),
      meaning: mt.phrase.meaning,
      type: mt.phrase.type,
    });
    cursor = mt.end;
  }
  if (cursor < text.length) {
    segs.push({ kind: 'text', text: text.slice(cursor) });
  }
  return segs;
}

// ---- 英文文本渲染：支持挖空与关键短语高亮 ----
const EnglishLine = ({
  text,
  keyPhrases,
  isCloze,
  isActive,
}: {
  text: string;
  keyPhrases: KeyPhrase[];
  isCloze: boolean;
  isActive: boolean;
}) => {
  const segments = useMemo(() => splitByKeyPhrases(text, keyPhrases), [text, keyPhrases]);

  return (
    <span className={`leading-relaxed ${isActive ? 'text-gray-900' : 'text-gray-800'}`}>
      {segments.map((seg, idx) => {
        if (seg.kind === 'text') {
          return <span key={idx}>{seg.text}</span>;
        }
        if (isCloze) {
          const placeholder = seg.text.replace(/[a-zA-Z]/g, '_');
          return (
            <input
              key={idx}
              type="text"
              placeholder={placeholder}
              className="mx-1 inline-block min-w-[4rem] px-1 py-0.5 border-b-2 border-emerald-300 bg-emerald-50 text-center text-[13px] font-medium text-emerald-700 outline-none focus:border-emerald-600 focus:bg-emerald-100 transition-colors"
              style={{ width: `${Math.max(seg.text.length * 0.6, 4)}rem` }}
            />
          );
        }
        return (
          <span
            key={idx}
            title={`${seg.meaning} · ${seg.type}`}
            className="text-emerald-600 font-medium decoration-emerald-300 decoration-dotted underline-offset-4 hover:underline cursor-help"
          >
            {seg.text}
          </span>
        );
      })}
    </span>
  );
};

export default function EnglishLearningPlayer() {
  const [langMode, setLangMode] = useState<'bilingual' | 'en' | 'zh'>('bilingual');
  const [isCloze, setIsCloze] = useState(false);
  const [blurSubtitles, setBlurSubtitles] = useState(false);
  const [revealedIds, setRevealedIds] = useState<Set<number>>(() => new Set());
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [loopSentence, setLoopSentence] = useState(false);
  const [autoFollow, setAutoFollow] = useState(true);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isSwapped, setIsSwapped] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const plyrRef = useRef<import('plyr').default | null>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const activeItemRef = useRef<HTMLDivElement>(null);
  const isUserScrolling = useRef(false);
  const scrollTimer = useRef<NodeJS.Timeout | null>(null);

  // 新数据结构
  const subtitles = videoData.subtitles as Subtitle[];

  // 过滤掉极短（<0.05s）的过渡字幕，避免闪烁滚动
  const transcript = useMemo(
    () => subtitles.filter((s) => s.end - s.start > 0.2),
    [subtitles]
  );

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const formatDate = (iso: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
  };

  // 找到当前激活的字幕索引
  const findActiveIndex = useCallback(
    (time: number) => {
      for (let i = 0; i < transcript.length; i++) {
        const item = transcript[i];
        if (time >= item.start && time < item.end) {
          return i;
        }
      }
      return -1;
    },
    [transcript]
  );

  // 初始化 Plyr 播放器
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let cancelled = false;
    (async () => {
      const Plyr = (await import('plyr')).default;
      if (cancelled) return;
      const player = new Plyr(video, {
        controls: [
          'play-large',
          'play',
          'progress',
          'current-time',
          'duration',
          'mute',
          'volume',
          'captions',
          'settings',
          'pip',
          'airplay',
          'fullscreen',
        ],
        settings: ['captions', 'quality', 'speed'],
        speed: { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 2] },
        keyboard: { focused: true, global: false },
        tooltips: { controls: true, seek: true },
        ratio: '16:9',
      });
      plyrRef.current = player;
    })();

    return () => {
      cancelled = true;
      try {
        plyrRef.current?.destroy();
      } catch {
        /* ignore */
      }
      plyrRef.current = null;
    };
  }, []);

  // 视频时间更新 → 同步字幕
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let rafId: number;
    const tick = () => {
      const t = video.currentTime;
      setCurrentTime(t);
      const idx = findActiveIndex(t);
      setActiveIndex(idx);

      if (loopSentence && idx >= 0) {
        const item = transcript[idx];
        if (t >= item.end - 0.05) {
          video.currentTime = item.start;
        }
      }
      rafId = requestAnimationFrame(tick);
    };

    const onPlay = () => {
      setIsPlaying(true);
      rafId = requestAnimationFrame(tick);
    };
    const onPause = () => {
      setIsPlaying(false);
      cancelAnimationFrame(rafId);
    };
    const onSeeked = () => {
      const t = video.currentTime;
      setCurrentTime(t);
      setActiveIndex(findActiveIndex(t));
    };

    if (!video.paused) {
      rafId = requestAnimationFrame(tick);
    }

    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('seeked', onSeeked);
    return () => {
      cancelAnimationFrame(rafId);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('seeked', onSeeked);
    };
  }, [findActiveIndex, loopSentence, transcript]);

  // 自动滚动字幕到当前激活项
  useEffect(() => {
    if (!autoFollow || isUserScrolling.current) return;
    if (!activeItemRef.current || !transcriptRef.current) return;
    activeItemRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [activeIndex, autoFollow]);

  // 检测用户手动滚动，暂停自动滚动 2 秒
  useEffect(() => {
    const container = transcriptRef.current;
    if (!container) return;
    const onScroll = () => {
      isUserScrolling.current = true;
      if (scrollTimer.current) clearTimeout(scrollTimer.current);
      scrollTimer.current = setTimeout(() => {
        isUserScrolling.current = false;
      }, 2000);
    };
    container.addEventListener('scroll', onScroll, { passive: true });
    return () => container.removeEventListener('scroll', onScroll);
  }, []);

  const seekTo = (time: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = time;
    setCurrentTime(time);
    setActiveIndex(findActiveIndex(time));
    if (!isPlaying) videoRef.current.play();
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play();
    else video.pause();
  };

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

  const currentItem = activeIndex >= 0 ? transcript[activeIndex] : null;

  const title = videoData.title as { en: string; zh: string };
  const tags = (videoData.tags as string[]) || [];

  return (
    <div
      className={`flex flex-col h-[calc(100vh-4rem)] bg-gray-50 text-gray-800 font-sans ${isSwapped ? 'lg:flex-row-reverse' : 'lg:flex-row'
        }`}
    >
      {/* ===== 左侧：视频播放区域 ===== */}
      <div className="w-full lg:w-[50%] flex flex-col bg-white shadow-sm z-10 relative shrink-0 lg:shrink">
        {/* 顶部标题区 */}
        <div className="px-2 lg:px-5 pt-4 pb-3 border-b border-gray-100">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h1 className="text-base lg:text-lg font-bold text-gray-900 truncate">{title.en}</h1>
              <p className="text-xs text-gray-500 mt-1 truncate lg:block hidden">
                {title.zh}
                {videoData.author && (
                  <span className="text-gray-400"> · {videoData.author}</span>
                )}
              </p>
            </div>
            <div className="lg:flex hidden items-center gap-2 shrink-0 mt-0.5">
              {videoData.level && (
                <span className="text-[11px] bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-full text-gray-600 font-medium">
                  {videoData.level}
                </span>
              )}
              {videoData.published_at && (
                <span className="text-[11px] text-gray-400">
                  发布于 {formatDate(videoData.published_at)}
                </span>
              )}
              <button
                onClick={() => setIsSwapped((v) => !v)}
                className="p-1 cursor-pointer rounded-md text-gray-400 hover:text-indigo-600 hover:bg-gray-100 transition lg:block hidden"
                title={isSwapped ? '还原左右布局' : '切换左右布局'}
                aria-label="切换左右布局"
              >
                <ArrowLeftRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 标签 */}
          {tags.length > 0 && (
            <div className="items-center gap-1.5 mt-2.5 flex-wrap lg:flex hidden">
              <Tag className="w-3.5 h-3.5 text-gray-400" />
              {tags.slice(0, 6).map((t) => (
                <span
                  key={t}
                  className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 视频 */}
        <div
          className="w-full bg-black plyr-wrapper"
          style={
            {
              ['--plyr-color-main' as string]: '#4f46e5',
              ['--plyr-video-background' as string]: '#000',
            } as React.CSSProperties
          }
        >
          <video
            ref={videoRef}
            className="w-full aspect-video"
            playsInline
            preload="metadata"
            poster="/images/demo-cover.jpg"
          >
            <source src="/videos/demo.mp4" type="video/mp4" />
          </video>
        </div>

        {/* 底部交互区（仅 lg 及以上显示） */}
        <div className="flex-1 px-4 py-4 hidden lg:flex flex-col justify-between items-center bg-gray-50/60 min-h-0">
          {/* 当前字幕 */}
          <div className="flex-1 w-full flex flex-col items-center justify-center min-h-[4rem]">
            {currentItem ? (
              <>
                <p className="text-center text-[17px] md:text-lg font-medium leading-relaxed max-w-3xl">
                  <EnglishLine
                    text={currentItem.en}
                    keyPhrases={currentItem.key_phrases}
                    isCloze={false}
                    isActive={true}
                  />
                </p>
                {currentItem.zh && (
                  <p className="text-center text-sm text-gray-500 mt-2 max-w-3xl">
                    {currentItem.zh}
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="text-gray-500 text-base">暂无字幕</p>
                <p className="text-gray-400 text-xs mt-1">当前时间点未匹配到字幕内容。</p>
              </>
            )}
          </div>

          {/* 控制按钮 */}
          <div className="flex items-end gap-2 md:gap-6 text-gray-500 text-[11px] mt-3 overflow-x-auto max-w-full">
            <CtrlButton label={`${playbackRate}x`} text="倍速" onClick={cycleRate} icon={<Gauge className="w-4 h-4" />} />
            <CtrlButton
              label=""
              text="单句循环"
              active={loopSentence}
              onClick={() => setLoopSentence((v) => !v)}
              icon={<Repeat className="w-4 h-4" />}
            />
            <CtrlButton label="" text="上一句" onClick={() => jumpSentence(-1)} icon={<ChevronLeft className="w-4 h-4" />} />

            <div className="flex flex-col items-center gap-2">
              <button
                onClick={togglePlay}
                className="w-12 h-12 cursor-pointer bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-md hover:bg-indigo-700 transition shrink-0"
                aria-label={isPlaying ? '暂停' : '播放'}
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 translate-x-0.5" />}
              </button>
              <span className="text-xs">{isPlaying ? '暂停' : '播放'}</span>
            </div>

            <CtrlButton label="" text="下一句" onClick={() => jumpSentence(1)} icon={<ChevronRight className="w-4 h-4" />} />
            <CtrlButton
              label=""
              text="练习模式"
              active={isCloze}
              onClick={() => setIsCloze((v) => !v)}
              icon={<GraduationCap className="w-4 h-4" />}
            />
            <CtrlButton
              label=""
              text="自动跟随"
              active={autoFollow}
              onClick={() => setAutoFollow((v) => !v)}
              icon={<MousePointerClick className="w-4 h-4" />}
            />
          </div>
        </div>
      </div>

      {/* ===== 右侧：字幕交互区域 ===== */}
      <div
        className={`w-full lg:w-[50%] flex flex-col flex-1 min-h-0 lg:flex-none lg:h-full bg-white relative ${isSwapped ? 'lg:border-r border-gray-100' : 'lg:border-l border-gray-100'
          }`}
      >
        {/* 顶部控制栏 */}
        <div className="flex items-center justify-between px-2 lg:px-4 py-3 border-b border-gray-100 shadow-sm shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex bg-gray-100 p-0.5 rounded-full text-sm font-medium border border-gray-200">
              {(
                [
                  { id: 'bilingual', label: '双语' },
                  { id: 'en', label: '英' },
                  { id: 'zh', label: '中' },
                ] as const
              ).map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => setLangMode(mode.id)}
                  className={`px-3.5 py-1 rounded-full transition-all duration-200 ${langMode === mode.id
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                    }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => setIsCloze(!isCloze)}
              className={`px-3.5 py-1 rounded-full text-sm font-medium transition-colors border ${isCloze
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
            >
              挖空
            </button>
          </div>

          <div className="flex items-center gap-2 text-gray-400">

            <button
              onClick={() => {
                setBlurSubtitles((v) => {
                  const next = !v;
                  if (next) setRevealedIds(new Set());
                  return next;
                });
              }}
              className={`p-1.5 rounded-full transition ${blurSubtitles
                  ? 'bg-indigo-50 text-indigo-600'
                  : 'text-gray-400 hover:bg-gray-100 hover:text-indigo-600'
                }`}
              title={blurSubtitles ? '显示字幕' : '隐藏字幕（点击单条可查看）'}
            >
              {blurSubtitles ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* 字幕滚动列表 */}
        <div
          ref={transcriptRef}
          className="flex-1 overflow-y-auto px-2 md:px-6 py-4 space-y-1 pb-24"
        >
          {transcript.map((item, index) => {
            const isActive = index === activeIndex;
            const isRevealed = revealedIds.has(item.index);
            const isHidden = blurSubtitles && !isRevealed;
            return (
              <div
                key={item.index}
                ref={isActive ? activeItemRef : undefined}
                onClick={() => {
                  if (isHidden) {
                    setRevealedIds((prev) => {
                      const next = new Set(prev);
                      next.add(item.index);
                      return next;
                    });
                    return;
                  }
                  seekTo(item.start);
                }}
                className={`relative pl-4 py-3 cursor-pointer transition-all duration-300 group rounded-md ${isActive
                    ? 'border-l-[3px] border-indigo-600 bg-indigo-50/50'
                    : 'border-l-[3px] border-transparent hover:bg-gray-50'
                  }`}
              >
                {/* 时间戳 + 操作 */}
                <div className="flex items-center justify-between text-[11px] font-mono text-gray-400 mb-1.5">
                  <span>
                    {formatTime(item.start)} → {formatTime(item.end)}
                  </span>
                  <div
                    className={`space-x-3 text-gray-500 flex items-center ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      } transition-opacity`}
                  >
                    <button
                      className="hover:text-indigo-600 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                    >
                      📖 解析
                    </button>
                    <button
                      className="hover:text-orange-400 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                    >
                      ⭐ 收藏
                    </button>
                    <button
                      className="hover:text-indigo-600 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard?.writeText(item.en);
                      }}
                    >
                      📋 复制
                    </button>
                  </div>
                </div>

                {/* 文本 */}
                <div
                  className={`text-[15px] md:text-[15.5px] leading-relaxed transition-[filter,opacity] duration-200 ${isHidden
                      ? 'blur-[5px] select-none opacity-80 pointer-events-none'
                      : ''
                    }`}
                  aria-hidden={isHidden}
                >
                  {(langMode === 'bilingual' || langMode === 'en') && (
                    <div className="mb-1">
                      <EnglishLine
                        text={item.en}
                        keyPhrases={item.key_phrases}
                        isCloze={isCloze}
                        isActive={isActive}
                      />
                    </div>
                  )}
                  {(langMode === 'bilingual' || langMode === 'zh') && (
                    <div
                      className={`text-[13.5px] mt-1 ${isActive ? 'text-gray-600' : 'text-gray-400'
                        }`}
                    >
                      {item.zh || '\u00A0'}
                    </div>
                  )}
                </div>
                {isHidden && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-end pr-3">
                    <span className="text-[11px] text-gray-400 bg-white/60 backdrop-blur-sm px-2 py-0.5 rounded-full border border-gray-100">
                      点击查看
                    </span>
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

// ---- 底部小控件 ----
function CtrlButton({
  label,
  text,
  onClick,
  icon,
  active,
}: {
  label: string;
  text: string;
  onClick: () => void;
  icon: React.ReactNode;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1 shrink-0 group cursor-pointer"
    >
      <span
        className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors border ${active
            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
            : 'bg-white text-gray-500 border-gray-200 group-hover:text-indigo-600 group-hover:border-indigo-200'
          }`}
      >
        {label ? <span className="text-[11px] font-mono font-semibold">{label}</span> : icon}
      </span>
      <span
        className={`text-[11px] ${active ? 'text-indigo-600 font-medium' : 'text-gray-500 group-hover:text-indigo-600'}`}
      >
        {text}
      </span>
    </button>
  );
}
