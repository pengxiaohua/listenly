import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export const cn = (...inputs: ClassValue[]) => {
  return twMerge(clsx(inputs));
}

/**
 * 获取当前 UTC 时间，用于数据库存储
 */
export function getCurrentUTCTime(): Date {
  return new Date();
}

/**
 * 将 UTC 时间转换为东八区时间字符串显示
 */
export function formatTimeForDisplay(utcDate: Date | string): string {
  const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate;
  return date.toLocaleString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

/**
 * 将 UTC 时间转换为东八区时间对象
 */
export function convertUTCToBeijingTime(utcDate: Date | string): Date {
  const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate;
  return new Date(date.getTime() + 8 * 60 * 60 * 1000);
}

/**
 * 检查两个单词是否是英式/美式拼写的变体
 * 支持常见的英式/美式拼写差异：
 * - -our vs -or (favourite vs favorite, colour vs color)
 * - -ise vs -ize (organise vs organize, realise vs realize)
 * - practice vs practise (practice是美式，practise是英式动词)
 * - aeroplane vs airplane (aeroplane是英式，airplane是美式)
 * - -re vs -er (centre vs center, theatre vs theater)
 * - -ogue vs -og (dialogue vs dialog, catalogue vs catalog)
 * - -ll vs -l (travelled vs traveled, cancelled vs canceled)
 * - -ae vs -e (aesthetic vs esthetic, anaemia vs anemia)
 * - -oe vs -e (manoeuvre vs maneuver, oesophagus vs esophagus)
 */
export function isBritishAmericanVariant(word1: string, word2: string): boolean {
  const w1 = word1.toLowerCase().trim();
  const w2 = word2.toLowerCase().trim();

  // 完全匹配
  if (w1 === w2) return true;

  // 如果长度差异超过1，不太可能是变体（除了双写字母的情况）
  if (Math.abs(w1.length - w2.length) > 1) return false;

  // 常见的英式/美式拼写差异模式
  const transformations = [
    // -our vs -or (favourite/favorite, colour/color, honour/honor, behaviour/behavior)
    {
      check: (w: string) => w.endsWith('our'),
      convert: (w: string) => w.slice(0, -3) + 'or'
    },
    {
      check: (w: string) => w.endsWith('or'),
      convert: (w: string) => w.slice(0, -2) + 'our'
    },
    // -ise vs -ize (organise/organize, realise/realize, recognise/recognize)
    {
      check: (w: string) => w.endsWith('ise'),
      convert: (w: string) => w.slice(0, -3) + 'ize'
    },
    {
      check: (w: string) => w.endsWith('ize'),
      convert: (w: string) => w.slice(0, -3) + 'ise'
    },
    // practice vs practise (美式/英式拼写，practice是美式，practise是英式动词)
    {
      check: (w: string) => w === 'practice',
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      convert: (_w: string) => 'practise'
    },
    {
      check: (w: string) => w === 'practise',
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      convert: (_w: string) => 'practice'
    },
    // aeroplane vs airplane (英式/美式拼写，aeroplane是英式，airplane是美式)
    {
      check: (w: string) => w === 'aeroplane',
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      convert: (_w: string) => 'airplane'
    },
    {
      check: (w: string) => w === 'airplane',
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      convert: (_w: string) => 'aeroplane'
    },
    // -re vs -er (centre/center, theatre/theater, metre/meter, fibre/fiber)
    // 注意：只处理常见的单词，避免误判（如 water/watre）
    {
      check: (w: string) => {
        if (!w.endsWith('re') || w.length <= 2) return false;
        // 常见的以 -re 结尾的英式拼写单词
        const commonBritishRe = ['centre', 'theatre', 'metre', 'fibre', 'calibre', 'sabre', 'sombre', 'lustre'];
        return commonBritishRe.includes(w) || w.match(/[^aeiou]re$/);
      },
      convert: (w: string) => w.slice(0, -2) + 'er'
    },
    {
      check: (w: string) => {
        if (!w.endsWith('er') || w.length <= 2) return false;
        // 检查是否是可能的英式变体（以辅音+er结尾，且不是常见的-er单词）
        const commonAmericanEr = ['water', 'mother', 'father', 'sister', 'brother', 'teacher', 'worker'];
        if (commonAmericanEr.includes(w)) return false;
        return w.match(/[^aeiou]er$/);
      },
      convert: (w: string) => w.slice(0, -2) + 're'
    },
    // -ogue vs -og (dialogue/dialog, catalogue/catalog, monologue/monolog)
    {
      check: (w: string) => w.endsWith('ogue'),
      convert: (w: string) => w.slice(0, -4) + 'og'
    },
    {
      check: (w: string) => w.endsWith('og') && !w.endsWith('logue'),
      convert: (w: string) => w.slice(0, -2) + 'ogue'
    },
    // -lled vs -led (travelled/traveled, cancelled/canceled, labelled/labeled)
    {
      check: (w: string) => w.endsWith('lled'),
      convert: (w: string) => {
        // travelled -> travel + led = traveled
        const base = w.slice(0, -4); // 去掉 'lled'
        return base + 'led';
      }
    },
    {
      check: (w: string) => w.endsWith('led') && !w.endsWith('lled'),
      convert: (w: string) => {
        // traveled -> travel + lled = travelled
        const base = w.slice(0, -3); // 去掉 'led'
        const lastChar = base[base.length - 1];
        // 如果最后一个字符是辅音（特别是 l），则双写
        // 常见需要双写的单词：travel, cancel, label, model, level 等
        if (lastChar && !'aeiou'.includes(lastChar)) {
          return base + 'lled';
        }
        return base + 'led';
      }
    },
    // -lling vs -ling (travelling/traveling, cancelling/canceling)
    {
      check: (w: string) => w.endsWith('lling'),
      convert: (w: string) => w.slice(0, -4) + 'ling'
    },
    {
      check: (w: string) => w.endsWith('ling') && !w.endsWith('lling'),
      convert: (w: string) => {
        const base = w.slice(0, -4);
        const lastChar = base[base.length - 1];
        if (lastChar && !'aeiou'.includes(lastChar)) {
          return base + 'lling';
        }
        return base + 'ling';
      }
    },
    // -ller vs -ler (traveller/traveler, canceller/canceler)
    {
      check: (w: string) => w.endsWith('ller'),
      convert: (w: string) => w.slice(0, -4) + 'ler'
    },
    {
      check: (w: string) => w.endsWith('ler') && !w.endsWith('ller'),
      convert: (w: string) => {
        const base = w.slice(0, -3);
        const lastChar = base[base.length - 1];
        if (lastChar && !'aeiou'.includes(lastChar)) {
          return base + 'ller';
        }
        return base + 'ler';
      }
    },
  ];

  // 尝试每个转换规则
  for (const transform of transformations) {
    if (transform.check(w1)) {
      const converted = transform.convert(w1);
      if (converted === w2) return true;
    }
    if (transform.check(w2)) {
      const converted = transform.convert(w2);
      if (converted === w1) return true;
    }
  }

  // 处理 -ae vs -e (aesthetic/esthetic, anaemia/anemia)
  // 这个比较复杂，需要更精确的匹配
  const aePattern = /ae/g;
  if (aePattern.test(w1) || aePattern.test(w2)) {
    const w1NoAe = w1.replace(/ae/g, 'e');
    const w2NoAe = w2.replace(/ae/g, 'e');
    if (w1NoAe === w2 || w2NoAe === w1) return true;
  }

  // 处理 -oe vs -e (manoeuvre/maneuver, oesophagus/esophagus)
  const oePattern = /oe/g;
  if (oePattern.test(w1) || oePattern.test(w2)) {
    const w1NoOe = w1.replace(/oe/g, 'e');
    const w2NoOe = w2.replace(/oe/g, 'e');
    if (w1NoOe === w2 || w2NoOe === w1) return true;
  }

  return false;
}
