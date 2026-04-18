'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import confetti from 'canvas-confetti';
import { toast } from 'sonner';

import AuthGuard from '@/components/auth/AuthGuard';
import { Progress } from '@/components/ui/progress';
import ExitPracticeDialog from '@/components/common/ExitPracticeDialog';
import { FeedbackDialog } from '@/components/common/FeedbackDialog';
import GuidedTour, { type TourStep } from '@/components/common/GuidedTour';
import VipGateDialog from '@/components/common/VipGateDialog';
import type { LevelType, ProFilterType } from '@/components/common/CourseFilter';
import type { SortType } from '@/components/common/SortFilter';

import { playConfettiEffect } from '@/lib/confettiEffects';
import { isBritishAmericanVariant } from '@/lib/utils';
import { useIsMobile } from '@/lib/useIsMobile';
import { useAuthStore } from '@/store/auth';
import { useUserConfigStore } from '@/store/userConfig';
import { wordsTagsChineseMap, WordTags } from '@/constants';

import WordDictationMode from './components/WordDictationMode';
import WordModeSelectDialog from './components/WordModeSelectDialog';
import CatalogNav from './components/CatalogNav';
import WordSetGrid from './components/WordSetGrid';
import GroupList from './components/GroupList';
import SpellingPractice from './components/SpellingPractice';
import PracticeTopBar from './components/PracticeTopBar';
import CompletedView from './components/CompletedView';

import { useWordAudio } from './hooks/useWordAudio';
import { useVocabulary } from './hooks/useVocabulary';
import { useGlobalShortcuts } from './hooks/useGlobalShortcuts';

import { GROUP_SIZE, REVIEW_TAG, VOCAB_REVIEW_TAG } from './lib/constants';
import type { CatalogFirst, Word, WordGroupSummary, WordSet, StudyMode, WordInputStatus } from './lib/types';
import { normalizeWord, playSound, sortWordSets } from './lib/utils';

export default function WordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // --- 目录与词集 ---
  const [currentTag, setCurrentTag] = useState<WordTags | ''>('');
  const [catalogs, setCatalogs] = useState<CatalogFirst[]>([]);
  const [selectedFirstId, setSelectedFirstId] = useState<string>('ALL');
  const [selectedSecondId, setSelectedSecondId] = useState<string>('');
  const [selectedThirdId, setSelectedThirdId] = useState<string>('');
  const [wordSets, setWordSets] = useState<WordSet[]>([]);
  const [isWordSetsLoading, setIsWordSetsLoading] = useState(false);
  const [sortBy, setSortBy] = useState<SortType>('popular');
  const [filterLevels, setFilterLevels] = useState<LevelType[]>([]);
  const [filterPro, setFilterPro] = useState<ProFilterType[]>([]);

  // --- 词集详情 / 分组 ---
  const [selectedSet, setSelectedSet] = useState<WordSet | null>(null);
  const [wordGroups, setWordGroups] = useState<WordGroupSummary[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [groupProgress, setGroupProgress] = useState<{ done: number; total: number } | null>(null);

  // --- 练习状态 ---
  const [currentWords, setCurrentWords] = useState<Word[]>([]);
  const [currentWord, setCurrentWord] = useState<Word | null>(null);
  const [userWordInputs, setUserWordInputs] = useState<string[]>([]);
  const [currentWordInputIndex, setCurrentWordInputIndex] = useState(0);
  const [wordInputStatus, setWordInputStatus] = useState<WordInputStatus[]>([]);
  const [showAnswer, setShowAnswer] = useState(false);
  const [answerOverlayRevealed, setAnswerOverlayRevealed] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [totalWords, setTotalWords] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [currentOffset, setCurrentOffset] = useState(0);
  const [hasMoreWords, setHasMoreWords] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isCorpusCompleted, setIsCorpusCompleted] = useState(false);

  // --- UI/对话框 ---
  const [showFullScreen, setShowFullScreen] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [vipGateOpen, setVipGateOpen] = useState(false);

  // --- 复习数量 ---
  const [reviewCount, setReviewCount] = useState(0);
  const [vocabReviewCount, setVocabReviewCount] = useState(0);

  // --- 学习模式 ---
  const [studyMode, setStudyMode] = useState<StudyMode>(null);
  const [modeSelectOpen, setModeSelectOpen] = useState(false);
  const [pendingGroupOrder, setPendingGroupOrder] = useState<number | null>(null);
  const [dictationWords, setDictationWords] = useState<Word[]>([]);
  const [isDictationLoading, setIsDictationLoading] = useState(false);
  const [dictationGroupName, setDictationGroupName] = useState<string>('');

  // --- 配置 ---
  const userConfig = useUserConfigStore((state) => state.config);
  const showPhonetic = userConfig.learning.showPhonetic;
  const showTranslation = userConfig.learning.showTranslation;
  const swapShortcutKeys = userConfig.learning.swapShortcutKeys ?? false;
  const correctEffectType = userConfig.learning.correctEffectType ?? 'realistic';
  const voiceId = userConfig.learning.voiceId ?? 'default';
  const voiceSpeed = userConfig.learning.voiceSpeed ?? 1;
  const showReviewEntries = userConfig.learning.showReviewEntries ?? false;

  const isMobile = useIsMobile();
  const userInfo = useAuthStore((state) => state.userInfo);

  // --- 副作用参考 ---
  const initializedTagRef = useRef<string | null>(null);
  const hasErrorRef = useRef(false);

  // --- 自定义 Hook ---
  const { audioRef, audioUrl, isPlaying, playCurrent, speakCurrent } = useWordAudio({
    currentWord,
    currentTag: currentTag as string,
    voiceId,
    voiceSpeed,
  });

  const {
    isInVocabulary,
    isAddingToVocabulary,
    checkingVocabulary,
    addToVocabulary,
  } = useVocabulary(currentWord?.id);

  // URL 参数
  const setSlug = searchParams.get('set') || '';
  const groupOrderParam = searchParams.get('group');

  // --- 全局快捷键 ---
  useGlobalShortcuts({
    enabled: !!currentWord,
    swapShortcutKeys,
    onPlay: playCurrent,
    onShowAnswer: () => setShowAnswer(true),
    onHideAnswer: () => setShowAnswer(false),
    onAddVocab: addToVocabulary,
  });

  // 漫游式引导步骤
  const wordTourSteps: TourStep[] = useMemo(
    () => [
      {
        target: '[data-tour="word-shortcut-space"]',
        title: swapShortcutKeys ? '空格键 — 校验单词' : '空格键 — 朗读单词',
        content: swapShortcutKeys
          ? '输入单词后，按空格键校验当前单词是否正确。'
          : '按空格键可以重新播放当前单词的发音，帮助你记住读音。',
        image: swapShortcutKeys ? '/images/tours/verify-word-for-word.gif' : undefined,
        placement: 'top',
      },
      {
        target: '[data-tour="word-shortcut-enter"]',
        title: swapShortcutKeys ? '回车键 — 朗读单词' : '回车键 — 校验单词',
        content: swapShortcutKeys
          ? '按回车键可以重新播放当前单词的发音，帮助你记住读音。'
          : '输入单词后，按回车键校验当前单词是否正确。',
        image: swapShortcutKeys ? undefined : '/images/tours/verify-word-for-word.gif',
        placement: 'top',
      },
      {
        target: '[data-tour="word-shortcut-arrows"]',
        title: '上下方向键 — 显示/隐藏答案',
        content: '遇到不会的单词？按 ▼ 键显示完整答案，按 ▲ 键隐藏答案。',
        image: '/images/tours/show-answers-for-word.gif',
        placement: 'top',
      },
      {
        target: '[data-tour="word-shortcut-vocab"]',
        title: 'Ctrl + Q — 加入生词本',
        content: '按 Ctrl + Q 可以快速将当前单词加入生词本，无需点击按钮。',
        placement: 'top',
      },
      {
        target: '[data-tour="word-back-button"]',
        title: '返回按钮',
        content: '点击这里可以返回课程列表，你的学习进度会自动保存。',
        placement: 'right',
      },
      {
        target: '[data-tour="word-control-buttons"]',
        title: '功能按钮',
        content: '这里有三个实用功能：播放音频、将当前单词加入生词本、全屏显示。',
        placement: 'bottom',
      },
    ],
    [swapShortcutKeys],
  );

  // ---- 复习数量加载 ----
  const loadReviewCount = useCallback(() => {
    fetch('/api/word/review?limit=1')
      .then((res) => res.json())
      .then((data) => {
        if (data) setReviewCount(data.total || 0);
      })
      .catch((err) => console.error('加载错题数量失败:', err));
  }, []);

  const loadVocabReviewCount = useCallback(() => {
    fetch('/api/vocabulary/review?limit=1')
      .then((res) => res.json())
      .then((data) => {
        if (data) setVocabReviewCount(data.total || 0);
      })
      .catch((err) => console.error('加载生词本数量失败:', err));
  }, []);

  useEffect(() => {
    loadReviewCount();
    loadVocabReviewCount();
  }, [loadReviewCount, loadVocabReviewCount]);

  // ---- 目录树加载 ----
  useEffect(() => {
    fetch('/api/catalog')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setCatalogs(data.data);
      })
      .catch((err) => console.error('加载目录失败:', err));
  }, []);

  // ---- 词集列表加载 ----
  const loadWordSets = useCallback(() => {
    const params = new URLSearchParams();
    if (selectedFirstId && selectedFirstId !== 'ALL') {
      params.set('catalogFirstId', selectedFirstId);
    }
    if (selectedSecondId) params.set('catalogSecondId', selectedSecondId);
    if (selectedThirdId) params.set('catalogThirdId', selectedThirdId);

    setIsWordSetsLoading(true);
    return fetch(`/api/word/word-set?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setWordSets(sortWordSets(data.data, sortBy));
        }
      })
      .catch((err) => console.error('加载单词集失败:', err))
      .finally(() => setIsWordSetsLoading(false));
  }, [selectedFirstId, selectedSecondId, selectedThirdId, sortBy]);

  useEffect(() => {
    loadWordSets();
  }, [loadWordSets]);

  // 排序变化时重排已加载的词集
  useEffect(() => {
    setWordSets((prev) => (prev.length > 0 ? sortWordSets(prev, sortBy) : prev));
  }, [sortBy]);

  // ---- 统计信息加载 ----
  const loadCategoryStats = useCallback(async (category: string) => {
    try {
      if (category === REVIEW_TAG) {
        const response = await fetch('/api/word/review?limit=1');
        const data = await response.json();
        if (data) {
          setTotalWords(data.total || 0);
          setCorrectCount(0);
        }
        return;
      }
      if (category === VOCAB_REVIEW_TAG) {
        const response = await fetch('/api/vocabulary/review?limit=1');
        const data = await response.json();
        if (data) {
          setTotalWords(data.total || 0);
          setCorrectCount(0);
        }
        return;
      }
      const response = await fetch(`/api/word/stats?category=${category}`);
      const data = await response.json();
      if (data.success) {
        setCorrectCount(data.data.completed);
        setTotalWords(data.data.total);
      }
    } catch (error) {
      console.error('获取统计信息失败:', error);
    }
  }, []);

  // ---- 单词加载 ----
  const loadWords = useCallback(
    async (category: string, offset = 0, limit = GROUP_SIZE) => {
      try {
        if (category === REVIEW_TAG) {
          const response = await fetch(`/api/word/review?offset=${offset}&limit=${limit}`);
          const data = await response.json();
          if (data.words) {
            return { words: data.words, total: data.total, hasMore: data.hasMore };
          }
          return { words: [], total: 0, hasMore: false };
        }

        if (category === VOCAB_REVIEW_TAG) {
          const response = await fetch(`/api/vocabulary/review?offset=${offset}&limit=${limit}`);
          const data = await response.json();
          if (data.words) {
            return { words: data.words, total: data.total, hasMore: data.hasMore };
          }
          return { words: [], total: 0, hasMore: false };
        }

        const params = new URLSearchParams({ category });
        if (selectedGroupId && selectedGroupId > 0) {
          params.set('groupId', String(selectedGroupId));
        } else if (selectedGroupId && selectedGroupId < 0) {
          const virtualOrder = -selectedGroupId;
          const virtualOffset = (virtualOrder - 1) * GROUP_SIZE + offset;
          params.set('offset', String(virtualOffset));
          params.set('limit', String(limit));
        } else {
          params.set('limit', String(limit));
          params.set('offset', String(offset));
        }
        const response = await fetch(`/api/word/unfinished?${params.toString()}`);
        const data = await response.json();
        if (data.words) {
          return { words: data.words, total: data.total, hasMore: data.hasMore };
        }
        return { words: [], total: 0, hasMore: false };
      } catch (error) {
        console.error('加载单词失败:', error);
        return { words: [], total: 0, hasMore: false };
      }
    },
    [selectedGroupId],
  );

  const loadMoreWords = useCallback(async () => {
    if (!currentTag || isLoadingMore || !hasMoreWords) return;
    setIsLoadingMore(true);
    try {
      const { words: newWords, hasMore } = await loadWords(
        currentTag as string,
        currentOffset + GROUP_SIZE,
      );
      setCurrentWords((prev) => [...prev, ...newWords]);
      setCurrentOffset((prev) => prev + GROUP_SIZE);
      setHasMoreWords(hasMore);
    } catch (error) {
      console.error('加载更多单词失败:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [currentTag, currentOffset, hasMoreWords, isLoadingMore, loadWords]);

  const fetchNextWord = useCallback(
    async (initialOffset?: number) => {
      if (currentTag === '') return;
      setIsLoading(true);
      try {
        let candidateWords = initialOffset === 0 ? [] : currentWords;
        const targetOffset = initialOffset !== undefined ? initialOffset : currentOffset;

        if (candidateWords.length === 0) {
          const { words, hasMore } = await loadWords(currentTag as string, targetOffset, GROUP_SIZE);
          if (words.length === 0) {
            setIsCorpusCompleted(true);
            return;
          }
          setCurrentWords(words);
          setCurrentOffset(targetOffset + GROUP_SIZE);
          setHasMoreWords(hasMore);
          candidateWords = words;
        }

        if (candidateWords.length > 0) {
          const word = candidateWords[0];
          setCurrentWord(word);
          setTimeout(() => document.getElementById('word-input-0')?.focus(), 100);
          if (candidateWords.length <= 5 && hasMoreWords && !isLoadingMore) {
            loadMoreWords();
          }
        }
      } catch (error) {
        console.error('获取单词失败:', error);
      } finally {
        setIsLoading(false);
      }
    },
    [currentTag, currentWords, currentOffset, hasMoreWords, isLoadingMore, loadWords, loadMoreWords],
  );

  // ---- 记录拼写结果 ----
  const recordWordResult = useCallback(
    async (wordId: string, isCorrect: boolean, errorCount: number): Promise<boolean> => {
      if ((currentTag as string) === REVIEW_TAG || (currentTag as string) === VOCAB_REVIEW_TAG) {
        return true;
      }
      try {
        const response = await fetch('/api/word/create-record', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ wordId, isCorrect, errorCount }),
        });

        const data = await response.json();
        if (!data.success) {
          console.error('记录失败:', data.error);
          return false;
        }
        if (isCorrect && selectedGroupId) {
          setGroupProgress((prev) => {
            if (!prev) return prev;
            if (prev.done < prev.total) {
              return { done: prev.done + 1, total: prev.total };
            }
            return prev;
          });
        }
        return true;
      } catch (error) {
        console.error('记录拼写结果失败:', error);
        return false;
      }
    },
    [currentTag, selectedGroupId],
  );

  // ---- 完成当前单词 ----
  const finalizeCurrentWord = useCallback(async () => {
    if (!currentWord) return;

    setCorrectCount((prev) => prev + 1);
    playSound(`/sounds/${userConfig.sounds.correctSound}`, userConfig.sounds.correctVolume);

    if (correctEffectType !== 'none') {
      playConfettiEffect(correctEffectType);
    }

    if (currentWord.id) {
      if ((currentTag as string) === REVIEW_TAG) {
        try {
          await fetch('/api/word/master', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ wordId: currentWord.id }),
          });
        } catch (err) {
          console.error('标记掌握失败:', err);
        }
      }

      if ((currentTag as string) === VOCAB_REVIEW_TAG) {
        try {
          await fetch('/api/vocabulary/master', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ wordId: currentWord.id }),
          });
        } catch (err) {
          console.error('标记生词掌握失败:', err);
        }
      }

      const recordSuccess = await recordWordResult(currentWord.id, true, 0);
      if (recordSuccess && currentTag) {
        loadCategoryStats(currentTag);
      }
    }

    const updatedWords = currentWords.filter((w) => w.id !== currentWord.id);
    setCurrentWords(updatedWords);

    setTimeout(() => {
      if (updatedWords.length > 0) {
        const nextWord = updatedWords[0];
        setCurrentWord(nextWord);
        setTimeout(() => {
          document.getElementById('word-input-0')?.focus();
        }, 100);
      } else if (hasMoreWords) {
        loadMoreWords().then(() => {
          fetchNextWord();
        });
      } else {
        setCurrentWord(null);
        setIsCorpusCompleted(true);
      }
    }, 500);
  }, [
    currentWord,
    currentWords,
    currentTag,
    correctEffectType,
    userConfig,
    hasMoreWords,
    loadMoreWords,
    fetchNextWord,
    recordWordResult,
    loadCategoryStats,
  ]);

  // ---- 校验核心：被 keydown / 移动端按钮共同调用 ----
  const validateCurrentInput = useCallback(
    async (index: number) => {
      if (!currentWord) return;
      const parts = currentWord.word.trim().split(/\s+/).filter(Boolean);
      if (index >= parts.length) return;

      const targetWord = normalizeWord(parts[index]);
      const currentInput = normalizeWord(userWordInputs[index] || '');
      if (!targetWord) return;

      if (currentInput === targetWord || isBritishAmericanVariant(currentInput, targetWord)) {
        setWordInputStatus((prev) => {
          if (index >= prev.length) return prev;
          const next = [...prev];
          next[index] = 'correct';
          return next;
        });
        if (index < parts.length - 1) {
          playSound(`/sounds/${userConfig.sounds.correctSound}`, userConfig.sounds.correctVolume);
          setCurrentWordInputIndex(index + 1);
          setTimeout(() => {
            document.getElementById(`word-input-${index + 1}`)?.focus();
          }, 100);
        } else {
          await finalizeCurrentWord();
        }
      } else {
        hasErrorRef.current = true;
        setWordInputStatus((prev) => {
          if (index >= prev.length) return prev;
          const next = [...prev];
          next[index] = 'wrong';
          return next;
        });
        playSound(`/sounds/${userConfig.sounds.wrongSound}`, userConfig.sounds.wrongVolume);
        if (
          currentWord.id &&
          (currentTag as string) !== REVIEW_TAG &&
          (currentTag as string) !== VOCAB_REVIEW_TAG
        ) {
          await recordWordResult(currentWord.id, false, 1);
        }
      }
    },
    [currentWord, userWordInputs, userConfig, currentTag, finalizeCurrentWord, recordWordResult],
  );

  const handleWordInputChange = useCallback(
    (value: string, index: number) => {
      const prevValue = userWordInputs[index] || '';
      setUserWordInputs((prev) => {
        const next = [...prev];
        next[index] = value;
        return next;
      });
      setWordInputStatus((prev) => {
        if (index >= prev.length) return prev;
        const next = [...prev];
        next[index] = 'pending';
        return next;
      });
      if (value.length > prevValue.length) {
        playSound('/sounds/typing.mp3', userConfig.sounds.typingVolume);
      }
    },
    [userWordInputs, userConfig],
  );

  const handleWordInputKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>, index: number) => {
      if (!currentWord) return;
      const validateKey = swapShortcutKeys ? ' ' : 'Enter';
      if (e.key !== validateKey) {
        // 调换键后按回车由全局监听播放，需阻止默认行为避免表单提交
        if (e.key === 'Enter' && swapShortcutKeys) e.preventDefault();
        return;
      }
      e.preventDefault();
      validateCurrentInput(index);
    },
    [currentWord, swapShortcutKeys, validateCurrentInput],
  );

  // ---- URL 参数初始化 ----
  useEffect(() => {
    const reviewParam = searchParams.get('review');
    if (reviewParam === 'true') {
      setCurrentTag(REVIEW_TAG as unknown as WordTags);
      return;
    }
    const vocabReviewParam = searchParams.get('vocabReview');
    if (vocabReviewParam === 'true') {
      setCurrentTag(VOCAB_REVIEW_TAG as unknown as WordTags);
      return;
    }
    const nameParam = searchParams.get('name');
    if (nameParam && wordsTagsChineseMap[nameParam as WordTags]) {
      setCurrentTag(nameParam as WordTags);
    }
  }, [searchParams]);

  useEffect(() => {
    const idParam = searchParams.get('id');
    if (!idParam) return;
    if (/^\d+$/.test(idParam)) return;

    initializedTagRef.current = null;
    setCurrentTag(idParam as WordTags);
    setCurrentWord(null);
    setCurrentWords([]);
    setCurrentOffset(0);
    setHasMoreWords(true);
    setIsCorpusCompleted(false);

    const params = new URLSearchParams(searchParams.toString());
    params.set('set', idParam);
    params.delete('id');
    router.push(`/word?${params.toString()}`);
  }, [searchParams, router]);

  // 选择词库分类后获取首个未完成的单词
  useEffect(() => {
    if (!currentTag) return;
    loadCategoryStats(currentTag);
    if (initializedTagRef.current !== currentTag) {
      initializedTagRef.current = currentTag;
      fetchNextWord();
    }
  }, [currentTag, loadCategoryStats, fetchNextWord]);

  // 重置输入区
  useEffect(() => {
    hasErrorRef.current = false;
    if (!currentWord) {
      setUserWordInputs([]);
      setWordInputStatus([]);
      setCurrentWordInputIndex(0);
      return;
    }

    const trimmedWord = currentWord.word.trim();
    if (!trimmedWord) {
      setUserWordInputs([]);
      setWordInputStatus([]);
      setCurrentWordInputIndex(0);
      return;
    }

    const parts = trimmedWord.split(/\s+/);
    setUserWordInputs(Array(parts.length).fill(''));
    setWordInputStatus(Array(parts.length).fill('pending'));
    setCurrentWordInputIndex(0);
    setShowAnswer(false);

    setTimeout(() => {
      document.getElementById('word-input-0')?.focus();
    }, 100);
  }, [currentWord]);

  // 答案浮层动画
  useEffect(() => {
    if (showAnswer) {
      const id = requestAnimationFrame(() => setAnswerOverlayRevealed(true));
      return () => cancelAnimationFrame(id);
    } else {
      setAnswerOverlayRevealed(false);
    }
  }, [showAnswer]);

  // 完成特效
  useEffect(() => {
    if (isCorpusCompleted) {
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    }
  }, [isCorpusCompleted]);

  // 全屏监听
  useEffect(() => {
    const handleFullscreenChange = () => {
      setShowFullScreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    setShowFullScreen(!!document.fullscreenElement);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // ---- 分组加载 ----
  useEffect(() => {
    if (!setSlug) return;
    fetch(`/api/word/group?wordSet=${encodeURIComponent(setSlug)}`)
      .then((res) => res.json())
      .then((res) => {
        const groups = (Array.isArray(res.data) ? res.data : []) as WordGroupSummary[];
        setWordGroups(groups);

        const fromList = wordSets.find((ws) => ws.slug === setSlug);
        if (fromList) {
          setSelectedSet(fromList);
        } else {
          fetch('/api/word/word-set')
            .then((r) => r.json())
            .then((all) => {
              const found = (all?.data || all)?.find?.((ws: WordSet) => ws.slug === setSlug);
              if (found) setSelectedSet(found);
            })
            .catch(() => {});
        }

        if (groupOrderParam) {
          const orderNum = parseInt(groupOrderParam);
          const match = groups.find((g) => g.order === orderNum);
          if (match) {
            setSelectedGroupId(match.id);
            setGroupProgress({ done: match.done, total: match.total });
            handleTagChange(setSlug as WordTags);
          }
        } else {
          setSelectedGroupId(null);
          setCurrentTag('' as WordTags);
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setSlug, groupOrderParam]);

  // 虚拟分组选择（没有真实分组时）
  useEffect(() => {
    if (!setSlug || !groupOrderParam || !selectedSet || wordGroups.length > 0) return;
    const orderNum = parseInt(groupOrderParam);
    if (isNaN(orderNum)) return;

    const totalSetWords = selectedSet._count?.words || 0;
    if (totalSetWords === 0) return;

    const groupCount = Math.ceil(totalSetWords / GROUP_SIZE);
    if (orderNum > groupCount) return;

    const start = (orderNum - 1) * GROUP_SIZE + 1;
    const end = Math.min(orderNum * GROUP_SIZE, totalSetWords);
    const groupTotal = end - start + 1;

    setSelectedGroupId(-orderNum);
    setGroupProgress({ done: 0, total: groupTotal });
    handleTagChange(setSlug as WordTags);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setSlug, groupOrderParam, selectedSet, wordGroups.length]);

  // ---- 派生状态 ----
  const virtualGroups = useMemo(() => {
    if (wordGroups.length > 0 || !selectedSet) return [];
    const totalSetWords = selectedSet._count?.words || 0;
    if (totalSetWords === 0) return [];
    const groupCount = Math.ceil(totalSetWords / GROUP_SIZE);
    return Array.from({ length: groupCount }, (_, i) => {
      const start = i * GROUP_SIZE + 1;
      const end = Math.min((i + 1) * GROUP_SIZE, totalSetWords);
      const groupTotal = end - start + 1;
      return {
        id: -(i + 1),
        name: `第${i + 1}组`,
        kind: 'SIZE',
        order: i + 1,
        total: groupTotal,
        done: 0,
        lastStudiedAt: null,
        start,
        end,
      } as WordGroupSummary & { start: number; end: number };
    });
  }, [wordGroups.length, selectedSet]);

  const displayGroups = wordGroups.length > 0 ? wordGroups : virtualGroups;

  const availableSeconds = useMemo(
    () =>
      selectedFirstId && selectedFirstId !== 'ALL'
        ? catalogs.find((c) => c.id === parseInt(selectedFirstId))?.seconds || []
        : [],
    [catalogs, selectedFirstId],
  );

  const availableThirds = useMemo(
    () =>
      selectedSecondId && selectedSecondId !== 'NONE'
        ? availableSeconds.find((s) => s.id === parseInt(selectedSecondId))?.thirds || []
        : [],
    [availableSeconds, selectedSecondId],
  );

  const currentWordParts = currentWord ? currentWord.word.trim().split(/\s+/) : [];

  const lastStudiedSlug = useMemo(() => {
    const withDate = wordSets.filter((ws) => ws.lastStudiedAt);
    if (withDate.length === 0) return null;
    const sorted = [...withDate].sort(
      (a, b) => new Date(b.lastStudiedAt!).getTime() - new Date(a.lastStudiedAt!).getTime(),
    );
    return sorted[0].slug;
  }, [wordSets]);

  // ---- 导航与流程 ----
  function handleTagChange(tag: WordTags) {
    initializedTagRef.current = null;
    setCurrentTag(tag);
    setCurrentWord(null);
    setCurrentWords([]);
    setCurrentOffset(0);
    setHasMoreWords(true);
    setIsCorpusCompleted(false);
    const params = new URLSearchParams(searchParams.toString());
    params.delete('name');
    router.push(`/word?${params.toString()}`);
  }

  const handleBackToTagList = useCallback(() => {
    initializedTagRef.current = null;
    setCurrentTag('');
    setCurrentWord(null);
    setCurrentWords([]);
    setCurrentOffset(0);
    setHasMoreWords(true);
    setIsCorpusCompleted(false);
    router.push('/word');
    setTimeout(() => {
      loadWordSets();
      loadReviewCount();
      loadVocabReviewCount();
    }, 100);
  }, [router, loadWordSets, loadReviewCount, loadVocabReviewCount]);

  const handleBack = () => setShowExitDialog(true);

  const handleBackToCourseDetail = () => {
    setShowExitDialog(false);
    if (setSlug) {
      const params = new URLSearchParams(searchParams.toString());
      params.set('set', setSlug);
      params.delete('group');
      router.push(`/word?${params.toString()}`);
    }
  };

  const handleBackToCourseList = () => {
    setShowExitDialog(false);
    handleBackToTagList();
  };

  const handleContinueLearning = () => setShowExitDialog(false);

  const handleEnterReview = useCallback(() => {
    initializedTagRef.current = null;
    setCurrentTag(REVIEW_TAG as unknown as WordTags);
    setCurrentWord(null);
    setCurrentWords([]);
    setCurrentOffset(0);
    setHasMoreWords(true);
    setIsCorpusCompleted(false);
  }, []);

  const handleEnterVocabReview = useCallback(() => {
    initializedTagRef.current = null;
    setCurrentTag(VOCAB_REVIEW_TAG as unknown as WordTags);
    setCurrentWord(null);
    setCurrentWords([]);
    setCurrentOffset(0);
    setHasMoreWords(true);
    setIsCorpusCompleted(false);
  }, []);

  const handleSelectSet = useCallback(
    (slug: string) => {
      router.push(`/word?set=${slug}`);
    },
    [router],
  );

  const handleSelectGroupOrder = useCallback((order: number) => {
    setPendingGroupOrder(order);
    setModeSelectOpen(true);
  }, []);

  const handleSelectSpellingMode = useCallback(() => {
    if (pendingGroupOrder === null || !setSlug) return;
    setStudyMode('spelling');
    const params = new URLSearchParams(searchParams.toString());
    params.set('set', setSlug);
    params.set('group', String(pendingGroupOrder));
    router.push(`/word?${params.toString()}`);
    setPendingGroupOrder(null);
  }, [pendingGroupOrder, setSlug, searchParams, router]);

  const handleSelectDictationMode = useCallback(async () => {
    if (pendingGroupOrder === null || !setSlug) return;
    setStudyMode('dictation');
    setModeSelectOpen(false);
    setIsDictationLoading(true);

    try {
      const group = displayGroups.find((g) => g.order === pendingGroupOrder);
      if (!group) return;
      setDictationGroupName(group.name);

      const params = new URLSearchParams({ category: setSlug });
      if (group.id > 0) {
        params.set('groupId', String(group.id));
      } else {
        const virtualOffset = (pendingGroupOrder - 1) * GROUP_SIZE;
        params.set('offset', String(virtualOffset));
        params.set('limit', String(GROUP_SIZE));
      }
      const res = await fetch(`/api/word/all?${params.toString()}`);
      const data = await res.json();
      if (data.words && data.words.length > 0) {
        setDictationWords(data.words);
      } else {
        setStudyMode('spelling');
        const urlParams = new URLSearchParams(searchParams.toString());
        urlParams.set('set', setSlug);
        urlParams.set('group', String(pendingGroupOrder));
        router.push(`/word?${urlParams.toString()}`);
      }
    } catch (err) {
      console.error('加载听写单词失败:', err);
    } finally {
      setIsDictationLoading(false);
      setPendingGroupOrder(null);
    }
  }, [pendingGroupOrder, setSlug, displayGroups, searchParams, router]);

  const handleDictationBack = () => {
    setStudyMode(null);
    setDictationWords([]);
  };

  const handleRestart = async () => {
    if (!currentTag || !selectedGroupId) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/word/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wordSetSlug: currentTag, groupId: selectedGroupId }),
      });
      const data = await res.json();
      if (data.success) {
        setIsCorpusCompleted(false);
        setCurrentWords([]);
        setCurrentOffset(0);
        setHasMoreWords(true);
        setCorrectCount(0);
        if (selectedGroupId) {
          setGroupProgress((prev) => (prev ? { done: 0, total: prev.total } : null));
        }
        if (currentTag) loadCategoryStats(currentTag);
        await fetchNextWord(0);
      } else {
        toast.error(data.error || '重置失败');
      }
    } catch (error) {
      console.error('重置请求失败:', error);
      toast.error('重置请求失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNextGroup = useCallback(
    (nextOrder: number) => {
      if (!setSlug) return;
      router.push(`/word?set=${setSlug}&group=${nextOrder}`);
    },
    [router, setSlug],
  );

  const handleFullScreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error('全屏操作失败:', error);
    }
  };

  // 派生渲染条件
  const isReviewTag =
    (currentTag as string) === REVIEW_TAG || (currentTag as string) === VOCAB_REVIEW_TAG;
  const showProgressBar =
    studyMode !== 'dictation' &&
    ((!!selectedGroupId && !!currentTag) || (!setSlug && !!currentTag)) &&
    !isReviewTag;
  const showTourGuide = (isReviewTag || (currentTag && selectedGroupId)) && currentWord;

  return (
    <AuthGuard>
      <ExitPracticeDialog
        open={showExitDialog}
        onOpenChange={setShowExitDialog}
        onBackToCourseList={handleBackToCourseList}
        onBackToCourseDetail={setSlug ? handleBackToCourseDetail : undefined}
        onContinue={handleContinueLearning}
        showBackToCourseDetail={!!setSlug}
      />

      <audio ref={audioRef} preload="auto" autoPlay playsInline style={{ display: 'none' }} />

      {!currentTag && !setSlug && (
        <CatalogNav
          catalogs={catalogs}
          availableSeconds={availableSeconds}
          availableThirds={availableThirds}
          selectedFirstId={selectedFirstId}
          selectedSecondId={selectedSecondId}
          selectedThirdId={selectedThirdId}
          filterLevels={filterLevels}
          filterPro={filterPro}
          sortBy={sortBy}
          isMobile={isMobile}
          onSelectFirst={(v) => {
            setSelectedFirstId(v);
            setSelectedSecondId('');
            setSelectedThirdId('');
          }}
          onSelectSecond={(v) => {
            setSelectedSecondId(v);
            setSelectedThirdId('');
          }}
          onSelectThird={setSelectedThirdId}
          onChangeLevels={setFilterLevels}
          onChangePro={setFilterPro}
          onChangeSort={setSortBy}
          onFeedbackClick={() => setFeedbackOpen(true)}
        />
      )}

      {showProgressBar && (
        <div className="container mx-auto mt-6 px-2 md:px-0">
          <Progress
            value={
              groupProgress
                ? (groupProgress.done / (groupProgress.total || 1)) * 100
                : (correctCount / (totalWords || 1)) * 100
            }
            className="w-full h-2"
          />
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-slate-600">进度</span>
            <span className="text-sm text-slate-600">
              {groupProgress
                ? `${groupProgress.done} / ${groupProgress.total}`
                : `${correctCount} / ${totalWords}`}
              {isLoadingMore && (
                <span className="text-xs text-slate-500 ml-2">正在加载更多单词...</span>
              )}
            </span>
          </div>
        </div>
      )}

      <div className="container mx-auto py-4 px-2 sm:px-0">
        {studyMode === 'dictation' && (dictationWords.length > 0 || isDictationLoading) ? (
          isDictationLoading ? (
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
              <span className="ml-2">加载单词中...</span>
            </div>
          ) : (
            <WordDictationMode
              words={dictationWords}
              setName={selectedSet?.name}
              groupName={dictationGroupName}
              onBack={handleDictationBack}
              onComplete={() => {}}
              wordSetSlug={setSlug}
              audioRef={audioRef}
            />
          )
        ) : !currentTag ? (
          <div className="mb-4">
            {setSlug ? (
              <GroupList
                selectedSet={selectedSet}
                setSlug={setSlug}
                displayGroups={displayGroups}
                isUserPro={!!userInfo?.isPro}
                onBack={handleBackToTagList}
                onSelectGroup={handleSelectGroupOrder}
                onVipGate={() => setVipGateOpen(true)}
              />
            ) : (
              <WordSetGrid
                wordSets={wordSets}
                isLoading={isWordSetsLoading}
                filterLevels={filterLevels}
                filterPro={filterPro}
                lastStudiedSlug={lastStudiedSlug}
                reviewCount={reviewCount}
                vocabReviewCount={vocabReviewCount}
                showReviewEntries={showReviewEntries}
                onSelectSet={handleSelectSet}
                onEnterReview={handleEnterReview}
                onEnterVocabReview={handleEnterVocabReview}
              />
            )}
          </div>
        ) : (
          <PracticeTopBar
            isReviewTag={isReviewTag}
            totalWords={totalWords}
            selectedSet={selectedSet}
            selectedGroupId={selectedGroupId}
            displayGroups={displayGroups}
            audioUrl={audioUrl}
            isPlaying={isPlaying}
            currentWord={currentWord}
            isInVocabulary={isInVocabulary}
            checkingVocabulary={checkingVocabulary}
            isAddingToVocabulary={isAddingToVocabulary}
            showFullScreen={showFullScreen}
            onBack={handleBack}
            onPlay={playCurrent}
            onSpeak={() => speakCurrent(currentWord?.word || '', 'en-US')}
            onAddVocab={addToVocabulary}
            onFullScreen={handleFullScreen}
          />
        )}

        {(isReviewTag || (currentTag && selectedGroupId)) && (
          <div
            className={`flex flex-col items-center h-[calc(100vh-400px)] md:h-[calc(100vh-300px)] ${
              isCorpusCompleted || !currentWord ? 'justify-center' : 'justify-start md:justify-center -mt-10'
            }`}
          >
            {isCorpusCompleted ? (
              <CompletedView
                tag={currentTag as string}
                setSlug={setSlug}
                groupOrderParam={groupOrderParam}
                wordGroups={wordGroups}
                onBack={handleBack}
                onRestart={handleRestart}
                onBackToTagList={handleBackToTagList}
                onNextGroup={handleNextGroup}
              />
            ) : isLoading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
                <span className="ml-2">加载中...</span>
              </div>
            ) : !currentWord ? (
              <CompletedView
                tag={currentTag as string}
                setSlug={setSlug}
                groupOrderParam={groupOrderParam}
                wordGroups={wordGroups}
                onBack={handleBack}
                onRestart={handleRestart}
                onBackToTagList={handleBackToTagList}
                onNextGroup={handleNextGroup}
                allowReviewBranch={false}
              />
            ) : (
              <SpellingPractice
                currentWord={currentWord}
                currentWordParts={currentWordParts}
                userWordInputs={userWordInputs}
                wordInputStatus={wordInputStatus}
                currentWordInputIndex={currentWordInputIndex}
                showAnswer={showAnswer}
                answerOverlayRevealed={answerOverlayRevealed}
                showPhonetic={showPhonetic}
                showTranslation={showTranslation}
                swapShortcutKeys={swapShortcutKeys}
                isInVocabulary={isInVocabulary}
                checkingVocabulary={checkingVocabulary}
                isAddingToVocabulary={isAddingToVocabulary}
                onInputChange={handleWordInputChange}
                onInputKeyDown={handleWordInputKeyDown}
                onValidate={validateCurrentInput}
                onToggleAnswer={() => setShowAnswer((prev) => !prev)}
                onPlay={playCurrent}
                onAddVocab={addToVocabulary}
              />
            )}
          </div>
        )}
      </div>

      {showTourGuide && <GuidedTour steps={wordTourSteps} tourKey="word-typing-guide" />}

      <VipGateDialog open={vipGateOpen} onOpenChange={setVipGateOpen} />
      <WordModeSelectDialog
        open={modeSelectOpen}
        onOpenChange={setModeSelectOpen}
        onSelectSpelling={handleSelectSpellingMode}
        onSelectDictation={handleSelectDictationMode}
      />
      <FeedbackDialog isOpen={feedbackOpen} onOpenChange={setFeedbackOpen} />
    </AuthGuard>
  );
}

