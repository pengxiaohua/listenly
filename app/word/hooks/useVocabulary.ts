import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

export function useVocabulary(currentWordId: string | undefined) {
  const [isInVocabulary, setIsInVocabulary] = useState(false);
  const [isAddingToVocabulary, setIsAddingToVocabulary] = useState(false);
  const [checkingVocabulary, setCheckingVocabulary] = useState(false);

  const checkStatus = useCallback(async (wordId: string) => {
    setCheckingVocabulary(true);
    try {
      const response = await fetch(`/api/vocabulary/check?type=word&wordId=${wordId}`);
      const data = await response.json();
      if (data.success) {
        setIsInVocabulary(data.exists);
      }
    } catch (error) {
      console.error('检查生词本状态失败:', error);
    } finally {
      setCheckingVocabulary(false);
    }
  }, []);

  // 当前单词变化时自动检查
  useEffect(() => {
    if (!currentWordId) {
      setIsInVocabulary(false);
      return;
    }
    checkStatus(currentWordId);
  }, [currentWordId, checkStatus]);

  const addToVocabulary = useCallback(async () => {
    if (!currentWordId) return;
    setIsAddingToVocabulary(true);
    try {
      const response = await fetch('/api/vocabulary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'word', wordId: currentWordId }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success('已添加到生词本！');
        setIsInVocabulary(true);
      } else if (response.status === 409) {
        toast.error('该单词已在生词本中');
        setIsInVocabulary(true);
      } else {
        toast.error(data.error || '添加失败');
      }
    } catch (error) {
      console.error('添加到生词本失败:', error);
      toast.error('添加失败，请重试');
    } finally {
      setIsAddingToVocabulary(false);
    }
  }, [currentWordId]);

  return {
    isInVocabulary,
    isAddingToVocabulary,
    checkingVocabulary,
    addToVocabulary,
    checkStatus,
  };
}
