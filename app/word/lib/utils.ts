import type { WordSet } from './types';
import type { SortType } from '@/components/common/SortFilter';

export function normalizeWord(value: string): string {
  return value.replace(/[.,!?:;()'"“”‘’\-]/g, '').toLowerCase().trim();
}

export function getSortKey(name: string): { num: number | null; char: string } {
  if (!name) return { num: null, char: '' };

  let startIdx = 0;
  while (startIdx < name.length && /[^\w\u4e00-\u9fa5]/.test(name[startIdx])) {
    startIdx++;
  }

  const numMatch = name.slice(startIdx).match(/^\d+/);
  const num = numMatch ? parseInt(numMatch[0], 10) : null;

  let charIdx = startIdx;
  if (numMatch) {
    charIdx = startIdx + numMatch[0].length;
  }

  while (charIdx < name.length && /[^\w\u4e00-\u9fa5]/.test(name[charIdx])) {
    charIdx++;
  }

  const char = charIdx < name.length ? name[charIdx] : '';

  return { num, char };
}

export function sortWordSets(sets: WordSet[], sortType: SortType): WordSet[] {
  const sorted = [...sets];
  switch (sortType) {
    case 'popular':
      sorted.sort((a, b) => (b.learnersCount || 0) - (a.learnersCount || 0));
      break;
    case 'latest':
      sorted.sort((a, b) => {
        if (!a.createdTime) return 1;
        if (!b.createdTime) return -1;
        return new Date(b.createdTime).getTime() - new Date(a.createdTime).getTime();
      });
      break;
    case 'name':
      sorted.sort((a, b) => {
        const keyA = getSortKey(a.name);
        const keyB = getSortKey(b.name);

        if (keyA.num !== null && keyB.num !== null) {
          if (keyA.num !== keyB.num) {
            return keyA.num - keyB.num;
          }
        } else if (keyA.num !== null) {
          return -1;
        } else if (keyB.num !== null) {
          return 1;
        }

        return keyA.char.localeCompare(keyB.char, 'zh-CN');
      });
      break;
  }
  return sorted;
}

export function playSound(src: string, volume: number): void {
  const audio = new Audio(src);
  audio.volume = Math.max(0, Math.min(1, volume));
  audio.play().catch(() => {});
}
