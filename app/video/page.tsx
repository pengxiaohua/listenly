'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import videoData from '@/constants/data.json';

// --- 辅助组件：挖空渲染 ---
const ClozeText = ({ text, isCloze, isActive }: { text: string; isCloze: boolean; isActive: boolean }) => {
  if (!isCloze) {
    return <span className={isActive ? "text-emerald-600 font-medium" : "text-gray-800"}>{text}</span>;
  }
  const words = text.split(' ');
  return (
    <span className="leading-loose">
      {words.map((word, index) => {
        const isTarget = word.replace(/[^a-zA-Z]/g, '').length > 5;
        if (isTarget) {
          return (
            <input
              key={index}
              type="text"
              placeholder={word.replace(/[a-zA-Z]/g, '_')}
              className="mx-1 inline-block w-24 px-1 py-0.5 border-b-2 border-indigo-200 bg-emerald-50 text-center text-sm outline-none focus:border-indigo-500 focus:bg-emerald-100 transition-colors"
            />
          );
        }
        return <span key={index} className={isActive ? "text-emerald-600 font-medium" : "text-gray-800"}> {word} </span>;
      })}
    </span>
  );
};

export default function EnglishLearningPlayer() {
  const [langMode, setLangMode] = useState<'bilingual' | 'en' | 'zh'>('bilingual');
  const [isCloze, setIsCloze] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [loopSentence, setLoopSentence] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const videoRef = useRef<HTMLVideoElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const activeItemRef = useRef<HTMLDivElement>(null);
  const isUserScrolling = useRef(false);
  const scrollTimer = useRef<NodeJS.Timeout | null>(null);

  const transcript = videoData.transcript;

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // 找到当前激活的字幕索引
  const findActiveIndex = useCallback((time: number) => {
    for (let i = 0; i < transcript.length; i++) {
      const item = transcript[i];
      if (time >= item.start && time < item.start + item.duration) {
        return i;
      }
    }
    return -1;
  }, [transcript]);

  // 视频时间更新 → 同步字幕（用 rAF 替代 timeupdate 提高精度）
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let rafId: number;
    const tick = () => {
      const t = video.currentTime;
      setCurrentTime(t);
      const idx = findActiveIndex(t);
      setActiveIndex(idx);

      // 单句循环
      if (loopSentence && idx >= 0) {
        const item = transcript[idx];
        const end = item.start + item.duration;
        if (t >= end - 0.05) {
          video.currentTime = item.start;
        }
      }
      rafId = requestAnimationFrame(tick);
    };

    const onPlay = () => { setIsPlaying(true); rafId = requestAnimationFrame(tick); };
    const onPause = () => { setIsPlaying(false); cancelAnimationFrame(rafId); };
    const onSeeked = () => {
      const t = video.currentTime;
      setCurrentTime(t);
      setActiveIndex(findActiveIndex(t));
    };

    // 如果视频已经在播放，立即启动轮询
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
    if (isUserScrolling.current || !activeItemRef.current || !transcriptRef.current) return;
    activeItemRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [activeIndex]);

  // 检测用户手动滚动，暂停自动滚动 2 秒
  useEffect(() => {
    const container = transcriptRef.current;
    if (!container) return;
    const onScroll = () => {
      isUserScrolling.current = true;
      if (scrollTimer.current) clearTimeout(scrollTimer.current);
      scrollTimer.current = setTimeout(() => { isUserScrolling.current = false; }, 2000);
    };
    container.addEventListener('scroll', onScroll, { passive: true });
    return () => container.removeEventListener('scroll', onScroll);
  }, []);

  // 点击字幕跳转视频
  const seekTo = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      // 立即更新字幕高亮，不等 seeked 事件
      setCurrentTime(time);
      setActiveIndex(findActiveIndex(time));
      if (!isPlaying) videoRef.current.play();
    }
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play(); else video.pause();
  };

  const jumpSentence = (delta: number) => {
    const target = Math.max(0, Math.min(transcript.length - 1, activeIndex + delta));
    seekTo(transcript[target].start);
  };

  const cycleRate = () => {
    const rates = [0.5, 0.75, 1, 1.25, 1.5, 2];
    const next = rates[(rates.indexOf(playbackRate) + 1) % rates.length];
    setPlaybackRate(next);
    if (videoRef.current) videoRef.current.playbackRate = next;
  };

  // 当前激活的字幕文本
  const currentText = activeIndex >= 0 ? transcript[activeIndex].text : '';

  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-50 text-gray-800 font-sans">

      {/* ===== 左侧：视频播放区域 ===== */}
      <div className="w-full md:w-[55%] lg:w-[60%] flex flex-col bg-white shadow-sm z-10 relative">

        {/* 顶部标题 */}
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold text-gray-800 truncate">{videoData.metadata.title}</h1>
            <p className="text-xs text-gray-500 mt-1">{videoData.metadata.channel}</p>
          </div>
          <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-500 ml-3 shrink-0">A2</span>
        </div>

        {/* 视频 */}
        <div className="relative w-full aspect-video bg-black">
          <video
            ref={videoRef}
            className="absolute top-0 left-0 w-full h-full"
            src="/videos/demo.mp4"
            controls
            playsInline
          />
        </div>

        {/* 底部交互区 */}
        <div className="flex-1 p-4 flex flex-col justify-center items-center bg-gray-50/50">
          {/* 当前字幕 */}
          <div className="min-h-[3rem] flex items-center justify-center mb-4 px-4">
            {currentText ? (
              <p className="text-emerald-600 font-medium text-lg text-center">{currentText}</p>
            ) : (
              <p className="text-gray-400 text-sm">暂无字幕 — 当前时间点未匹配到字幕内容。</p>
            )}
          </div>

          {/* 控制按钮 */}
          <div className="flex items-center space-x-3 md:space-x-6 text-gray-500 text-sm">
            <button onClick={cycleRate} className="flex flex-col items-center hover:text-indigo-600">
              <span className="text-lg mb-1 font-mono">{playbackRate}x</span>倍速
            </button>
            <button onClick={() => setLoopSentence(!loopSentence)} className={`flex flex-col items-center ${loopSentence ? 'text-indigo-600' : 'hover:text-indigo-600'}`}>
              <span className="text-lg mb-1">⟲</span>单句循环
            </button>
            <button onClick={() => jumpSentence(-1)} className="flex flex-col items-center hover:text-indigo-600">
              <span className="text-lg mb-1">←</span>上一句
            </button>
            <button onClick={togglePlay} className="w-12 h-12 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-md hover:bg-indigo-700 transition text-xl">
              {isPlaying ? '⏸' : '▶'}
            </button>
            <button onClick={() => jumpSentence(1)} className="flex flex-col items-center hover:text-indigo-600">
              <span className="text-lg mb-1">→</span>下一句
            </button>
          </div>
        </div>
      </div>

      {/* ===== 右侧：字幕交互区域 ===== */}
      <div className="w-full md:w-[45%] lg:w-[40%] flex flex-col h-[50vh] md:h-screen bg-white relative">

        {/* 顶部控制栏 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shadow-sm shrink-0">
          <div className="flex bg-gray-100 p-0.5 rounded-full text-sm font-medium border border-gray-200">
            {([
              { id: 'bilingual', label: '双语' },
              { id: 'en', label: '英' },
              { id: 'zh', label: '中' },
            ] as const).map((mode) => (
              <button
                key={mode.id}
                onClick={() => setLangMode(mode.id)}
                className={`px-4 py-1.5 rounded-full transition-all duration-200 ${
                  langMode === mode.id
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
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors border ${
              isCloze
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            挖空
          </button>
        </div>

        {/* 字幕滚动列表 */}
        <div ref={transcriptRef} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 pb-24">
          {transcript.map((item, index) => {
            const isActive = index === activeIndex;
            return (
              <div
                key={index}
                ref={isActive ? activeItemRef : undefined}
                onClick={() => seekTo(item.start)}
                className={`relative pl-4 py-2 cursor-pointer transition-all duration-300 group rounded-md ${
                  isActive
                    ? 'border-l-[3px] border-indigo-600 bg-indigo-50/50'
                    : 'border-l-[3px] border-transparent hover:bg-gray-50'
                }`}
              >
                {/* 时间戳 */}
                <div className="flex items-center justify-between text-[11px] font-mono text-gray-400 mb-1.5">
                  <span>{formatTime(item.start)} → {formatTime(item.start + item.duration)}</span>
                  <div className={`space-x-3 text-gray-500 flex items-center ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                    <button className="hover:text-indigo-600 text-xs">📖 解析</button>
                    <button className="hover:text-orange-400 text-xs">⭐ 收藏</button>
                    <button className="hover:text-indigo-600 text-xs">📋 复制</button>
                  </div>
                </div>

                {/* 文本 */}
                <div className="text-[15px] md:text-base leading-relaxed">
                  {(langMode === 'bilingual' || langMode === 'en') && (
                    <div className="mb-1">
                      <ClozeText text={item.text} isCloze={isCloze} isActive={isActive} />
                    </div>
                  )}
                  {(langMode === 'bilingual' || langMode === 'zh') && (
                    <div className={`text-sm ${isActive ? 'text-gray-600' : 'text-gray-400'}`}>
                      [中文翻译占位]
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
