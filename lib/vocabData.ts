// Vocab Data Loader — 静态导入六个 CEFR 等级词汇 JSON，按等级索引导出
// Requirements: 1.1, 1.2, 1.3, 10.2

import vocabA1 from '@/content/vocab/vocab_A1.json';
import vocabA2 from '@/content/vocab/vocab_A2.json';
import vocabB1 from '@/content/vocab/vocab_B1.json';
import vocabB2 from '@/content/vocab/vocab_B2.json';
import vocabC1 from '@/content/vocab/vocab_C1.json';
import vocabC2 from '@/content/vocab/vocab_C2.json';

/** 词汇条目 */
export interface VocabEntry {
  word: string;
  phonetic: string;
  definition: string;
  distractors: [string, string, string];
  audio_url: string;
}

/** CEFR 等级 */
export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

/** 六个 CEFR 等级常量数组 */
export const CEFR_LEVELS: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

/** 按等级索引（0=A1 … 5=C2）导出的词汇数组 */
export const vocabByLevel: VocabEntry[][] = [
  vocabA1 as VocabEntry[],
  vocabA2 as VocabEntry[],
  vocabB1 as VocabEntry[],
  vocabB2 as VocabEntry[],
  vocabC1 as VocabEntry[],
  vocabC2 as VocabEntry[],
];

/**
 * 从指定等级随机抽取一个未使用过的单词。
 * 若该等级词库已耗尽，向相邻等级（先低后高）回退查找。
 * @param levelIndex  等级索引 0–5
 * @param excludeWords 已使用单词集合
 * @returns 词汇条目，或 null（所有等级均耗尽）
 */
export function getRandomWord(
  levelIndex: number,
  excludeWords: Set<string>,
): VocabEntry | null {
  // 构建搜索顺序：当前等级优先，然后按距离交替向低/高扩展
  const searchOrder = buildSearchOrder(levelIndex);

  for (const idx of searchOrder) {
    const pool = vocabByLevel[idx];
    const available = pool.filter((e) => !excludeWords.has(e.word));
    if (available.length > 0) {
      return available[Math.floor(Math.random() * available.length)];
    }
  }

  return null;
}

/** 构建相邻等级搜索顺序：当前 → 低1 → 高1 → 低2 → 高2 … */
function buildSearchOrder(levelIndex: number): number[] {
  const order: number[] = [levelIndex];
  let lo = levelIndex - 1;
  let hi = levelIndex + 1;

  while (lo >= 0 || hi <= 5) {
    if (lo >= 0) order.push(lo--);
    if (hi <= 5) order.push(hi++);
  }

  return order;
}
