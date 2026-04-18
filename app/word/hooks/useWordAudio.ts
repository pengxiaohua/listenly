import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchTtsAudio, getVoiceSuffix } from '@/lib/useTtsAudio';
import { REVIEW_TAG, VOCAB_REVIEW_TAG } from '../lib/constants';
import type { Word } from '../lib/types';

interface UseWordAudioParams {
  currentWord: Word | null;
  currentTag: string;
  voiceId: string;
  voiceSpeed: number;
}

export function useWordAudio({ currentWord, currentTag, voiceId, voiceSpeed }: UseWordAudioParams) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const [audioUrl, setAudioUrl] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    synthRef.current = window.speechSynthesis;
  }, []);

  // 获取 mp3 url（含 TTS 兜底）
  useEffect(() => {
    if (!currentWord || !currentTag) return;

    const dir = currentTag === REVIEW_TAG || currentTag === VOCAB_REVIEW_TAG
      ? (currentWord.category ? `words/${currentWord.category}` : '')
      : `words/${currentTag}`;

    const voiceSuffix = getVoiceSuffix(voiceId);
    const voiceParam = voiceSuffix ? `&voiceSuffix=${encodeURIComponent(voiceSuffix)}` : '';

    fetch(`/api/word/mp3-url?word=${encodeURIComponent(currentWord.word)}&dir=${dir}${voiceParam}`)
      .then(res => res.json())
      .then(async (mp3) => {
        if (mp3?.url) {
          setAudioUrl(mp3.url);
        } else if (mp3?.needGenerate && voiceSuffix) {
          try {
            const url = await fetchTtsAudio({
              text: currentWord.word,
              voiceId,
              type: 'word',
              targetId: currentWord.id,
              ossDir: dir,
            });
            setAudioUrl(url);
          } catch (err) {
            console.error('TTS 生成失败:', err);
            setAudioUrl('');
          }
        } else {
          setAudioUrl('');
        }
      })
      .catch((error) => {
        console.error('获取MP3失败:', error);
      });
  }, [currentWord, currentTag, voiceId]);

  // 绑定 audio 元素事件 + 自动播放
  useEffect(() => {
    if (!audioUrl || !audioRef.current) return;

    const audio = audioRef.current;
    audio.src = audioUrl;
    audio.load();

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);

    const handleCanPlayThrough = () => {
      audio.playbackRate = voiceSpeed;
      audio.play().catch((err) => {
        console.error('自动播放失败:', err);
        setIsPlaying(false);
      });
    };

    audio.addEventListener('canplaythrough', handleCanPlayThrough);

    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('canplaythrough', handleCanPlayThrough);
    };
  }, [audioUrl, voiceSpeed]);

  const speakCurrent = useCallback((text: string, lang: string = 'en-US') => {
    const utterance = new SpeechSynthesisUtterance(text);
    synthRef.current?.cancel();
    utterance.lang = lang;
    utterance.rate = 1;
    synthRef.current?.speak(utterance);
  }, []);

  const playCurrent = useCallback(() => {
    if (!currentWord) return;
    if (!audioRef.current || !audioUrl) {
      speakCurrent(currentWord.word, 'en-US');
      return;
    }
    const audio = audioRef.current;
    audio.playbackRate = voiceSpeed;
    audio.play().catch((err) => {
      console.error('播放失败:', err);
      setIsPlaying(false);
    });
  }, [currentWord, audioUrl, voiceSpeed, speakCurrent]);

  return {
    audioRef,
    audioUrl,
    isPlaying,
    playCurrent,
    speakCurrent,
  };
}
