import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'

const SPACY_API = 'http://127.0.0.1:8000/api/analyze'

const POS_ZH_FALLBACK: Record<string, string> = {
  PROPN: '专有名词',
  INTJ: '感叹词',
}

const ROLE_ZH_FALLBACK: Record<string, string> = {
  compound: '称呼语',
  intj: '感叹语',
  advcl: '状语从句',
}

interface SpacyWord {
  word: string
  ipa: string
  pos: string
  syntax_role: string
}

interface WordAnalysis {
  word: string
  phonetic: string
  pos: string
  posZh: string
  role: string
}

function mapPos(pos: string): string {
  return POS_ZH_FALLBACK[pos] || pos
}

function mapRole(role: string): string {
  return ROLE_ZH_FALLBACK[role] || role
}

function mergeContractions(words: SpacyWord[]): SpacyWord[] {
  const result: SpacyWord[] = []
  for (const w of words) {
    if (w.word.startsWith("'") && result.length > 0) {
      const prev = result[result.length - 1]
      prev.word += w.word
    } else {
      result.push({ ...w })
    }
  }
  return result
}

function mergeProperNouns(analysis: WordAnalysis[]): void {
  let i = 0
  while (i < analysis.length) {
    if (analysis[i].pos === 'PROPN' || analysis[i].posZh === '专有名词') {
      let j = i
      while (j < analysis.length && (analysis[j].pos === 'PROPN' || analysis[j].posZh === '专有名词')) {
        analysis[j].posZh = '专有名词'
        analysis[j].role = '称呼语'
        j++
      }
      i = j
    } else {
      i++
    }
  }
}

function buildGroups(analysis: WordAnalysis[]) {
  const groups: Array<{ words: WordAnalysis[]; role: string }> = []
  for (const word of analysis) {
    const last = groups[groups.length - 1]
    if (last && last.role === word.role && word.role !== '' && word.role !== '谓语') {
      last.words.push(word)
    } else {
      groups.push({ words: [word], role: word.role })
    }
  }
  return groups
}

async function analyzeViaSpacy(text: string) {
  const res = await fetch(SPACY_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
    signal: AbortSignal.timeout(5000),
  })

  if (!res.ok) {
    throw new Error(`spaCy 服务返回 ${res.status}`)
  }

  const data = await res.json()
  const spacyWords: SpacyWord[] = data.words || []
  const merged = mergeContractions(spacyWords)

  const analysis: WordAnalysis[] = merged.map(w => ({
    word: w.word,
    phonetic: w.ipa || '',
    pos: w.pos,
    posZh: mapPos(w.pos),
    role: mapRole(w.syntax_role),
  }))

  if (analysis.length > 0 && analysis[0].word.toLowerCase() === "let's") {
    analysis[0].posZh = '动词短语'
  }

  mergeProperNouns(analysis)

  const groups = buildGroups(analysis)
  return { words: analysis, groups }
}

export async function POST(req: NextRequest) {
  try {
    const { text, sentenceId } = await req.json()
    if (!text) {
      return NextResponse.json({ error: '参数缺失' }, { status: 400 })
    }

    // 有 sentenceId 时先查缓存
    if (sentenceId) {
      const sentence = await prisma.sentence.findUnique({
        where: { id: sentenceId },
        select: { extraMetadata: true },
      })

      const meta = sentence?.extraMetadata as Record<string, unknown> | null
      if (meta?.analysis) {
        const cached = meta.analysis as { words: WordAnalysis[]; groups: Array<{ words: WordAnalysis[]; role: string }> }
        return NextResponse.json({
          success: true,
          words: cached.words,
          groups: cached.groups,
          sentence: text,
        })
      }
    }

    // 缓存 miss 或无 sentenceId → 调 spaCy
    const { words, groups } = await analyzeViaSpacy(text)

    // 有 sentenceId 时写回缓存（异步，不阻塞响应）
    if (sentenceId) {
      const sentence = await prisma.sentence.findUnique({
        where: { id: sentenceId },
        select: { extraMetadata: true },
      })
      const existing = (sentence?.extraMetadata as Record<string, unknown>) || {}
      prisma.sentence.update({
        where: { id: sentenceId },
        data: { extraMetadata: { ...existing, analysis: { words, groups } } as unknown as Prisma.InputJsonValue },
      }).catch(err => console.error('缓存分析结果失败:', err))
    }

    return NextResponse.json({
      success: true,
      words,
      groups,
      sentence: text,
    })
  } catch (error) {
    console.error('句子分析失败:', error)
    const message = error instanceof Error ? error.message : '分析失败'
    const status = message.includes('spaCy') ? 502 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
