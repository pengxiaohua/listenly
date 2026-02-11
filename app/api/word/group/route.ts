import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/word/group?wordSet=slug | ?setId=123
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const slug = searchParams.get('wordSet')
    const setIdParam = searchParams.get('setId')
    const userId = req.headers.get('x-user-id') || undefined

    let setId: number | null = null
    if (setIdParam) setId = parseInt(setIdParam)
    if (!setId && slug) {
      if (slug === 'review-mode') {
        const grouped = await prisma.wordRecord.groupBy({
          by: ['wordId'],
          where: {
            userId: userId ?? '',
            errorCount: { gt: 0 },
            isMastered: false,
            archived: false,
          },
          _max: { id: true }
        });
        const total = grouped.length;

        return NextResponse.json({
          success: true,
          data: [{
            id: -1,
            name: '错词本复习',
            kind: 'MANUAL',
            order: 0,
            total: total,
            done: 0,
            lastStudiedAt: null
          }]
        })
      }
      const ws = await prisma.wordSet.findUnique({ where: { slug }, select: { id: true } })
      if (!ws) return NextResponse.json({ success: true, data: [] })
      setId = ws.id
    }
    if (!setId) return NextResponse.json({ success: true, data: [] })

    const groups = await prisma.wordGroup.findMany({
      where: { wordSetId: setId },
      orderBy: { order: 'asc' },
      select: { id: true, name: true, kind: true, order: true }
    })

    const result = [] as Array<{ id: number; name: string; kind: string; order: number; total: number; done: number; lastStudiedAt: string | null }>
    if (groups.length > 0) {
      for (const g of groups) {
        const total = await prisma.word.count({ where: { wordGroupId: g.id } })
        let done = 0
        let lastStudiedAt: string | null = null
        if (userId) {
          // 统计已完成的不同单词数（按 wordId 去重，避免重复计数）
          const doneRecords = await prisma.wordRecord.findMany({
            where: {
              userId,
              OR: [{ isCorrect: true }, { isMastered: true }],
              archived: false,
              word: { wordGroupId: g.id },
            },
            select: { wordId: true },
            distinct: ['wordId'],
          })
          done = doneRecords.length
          // 获取该小组中最后一次学习的时间
          const lastRecord = await prisma.wordRecord.findFirst({
            where: {
              userId,
              word: { wordGroupId: g.id },
            },
            orderBy: { lastAttempt: 'desc' },
            select: { lastAttempt: true },
          })
          if (lastRecord) {
            lastStudiedAt = lastRecord.lastAttempt.toISOString()
          }
        }
        result.push({ id: g.id, name: g.name, kind: g.kind, order: g.order, total, done, lastStudiedAt })
      }
    } else {
      // 无真实分组时，按每 20 个单词虚拟分组
      const words = await prisma.word.findMany({
        where: { wordSetId: setId },
        select: { id: true },
        orderBy: { index: 'asc' },
      })
      const groupSize = 20
      const groupCount = Math.ceil(words.length / groupSize)

      const doneWordIds = new Set<string>()
      const lastAttemptByWordId = new Map<string, Date>()
      if (userId) {
        const records = await prisma.wordRecord.findMany({
          where: {
            userId,
            word: { wordSetId: setId },
          },
          select: {
            wordId: true,
            lastAttempt: true,
            isCorrect: true,
            isMastered: true,
            archived: true,
          },
        })
        for (const record of records) {
          if (!record.archived && (record.isCorrect || record.isMastered)) {
            doneWordIds.add(record.wordId)
          }
          const prev = lastAttemptByWordId.get(record.wordId)
          if (!prev || record.lastAttempt > prev) {
            lastAttemptByWordId.set(record.wordId, record.lastAttempt)
          }
        }
      }

      for (let i = 0; i < groupCount; i += 1) {
        const start = i * groupSize
        const end = Math.min((i + 1) * groupSize, words.length)
        const groupWords = words.slice(start, end)
        let done = 0
        let lastStudiedAt: string | null = null
        for (const w of groupWords) {
          if (doneWordIds.has(w.id)) {
            done += 1
          }
          const lastAttempt = lastAttemptByWordId.get(w.id)
          if (lastAttempt && (!lastStudiedAt || lastAttempt > new Date(lastStudiedAt))) {
            lastStudiedAt = lastAttempt.toISOString()
          }
        }
        result.push({
          id: -(i + 1),
          name: `第${i + 1}组`,
          kind: 'SIZE',
          order: i + 1,
          total: groupWords.length,
          done,
          lastStudiedAt,
        })
      }
    }

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('获取单词分组失败:', error)
    return NextResponse.json({ success: false, error: '获取分组失败' }, { status: 500 })
  }
}


