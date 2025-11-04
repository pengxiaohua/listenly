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
    for (const g of groups) {
      const total = await prisma.word.count({ where: { wordGroupId: g.id } })
      let done = 0
      let lastStudiedAt: string | null = null
      if (userId) {
        done = await prisma.wordRecord.count({
          where: {
            userId,
            OR: [{ isCorrect: true }, { isMastered: true }],
            word: { wordGroupId: g.id },
          },
        })
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

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('获取单词分组失败:', error)
    return NextResponse.json({ success: false, error: '获取分组失败' }, { status: 500 })
  }
}


