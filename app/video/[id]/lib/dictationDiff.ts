// 听写结果的单词级比对工具：基于 LCS 对齐用户输入与正确答案。

export type AnswerToken = { text: string; status: 'correct' | 'missed' }
export type InputToken = { text: string; status: 'correct' | 'wrong' }

export type DictationDiff = {
  answerTokens: AnswerToken[]
  inputTokens: InputToken[]
  correctCount: number
  total: number
  accuracy: number // 0~100
}

// 归一化单词用于比较：小写并去除首尾标点
function normalize(word: string): string {
  return word
    .toLowerCase()
    .replace(/^[^a-z0-9']+/i, '')
    .replace(/[^a-z0-9']+$/i, '')
    .replace(/[’]/g, "'")
}

// 将句子切分为「显示词」数组（保留原始形态）
function tokenize(text: string): string[] {
  return (text.match(/[A-Za-z0-9']+(?:[-'][A-Za-z0-9']+)*/g) || [])
}

/**
 * 比对用户输入与正确答案，返回单词级的标记结果。
 * - 正确答案中的词：correct（命中）/ missed（遗漏）
 * - 用户输入中的词：correct（命中）/ wrong（错误，答案中没有）
 */
export function diffDictation(input: string, answer: string): DictationDiff {
  const answerWords = tokenize(answer)
  const inputWords = tokenize(input)
  const a = answerWords.map(normalize)
  const b = inputWords.map(normalize)

  const n = a.length
  const m = b.length

  // LCS 动态规划
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }

  const answerMatched = new Array(n).fill(false)
  const inputMatched = new Array(m).fill(false)
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      answerMatched[i] = true
      inputMatched[j] = true
      i++
      j++
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      i++
    } else {
      j++
    }
  }

  const answerTokens: AnswerToken[] = answerWords.map((w, idx) => ({
    text: w,
    status: answerMatched[idx] ? 'correct' : 'missed',
  }))
  const inputTokens: InputToken[] = inputWords.map((w, idx) => ({
    text: w,
    status: inputMatched[idx] ? 'correct' : 'wrong',
  }))

  const correctCount = answerMatched.filter(Boolean).length
  const total = n
  const accuracy = total > 0 ? Math.round((correctCount / total) * 1000) / 10 : 0

  return { answerTokens, inputTokens, correctCount, total, accuracy }
}
