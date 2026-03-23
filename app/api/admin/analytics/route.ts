import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const user = await auth()
  if (!user?.isAdmin) {
    return NextResponse.json({ error: '无权限' }, { status: 403 })
  }

  const { searchParams } = request.nextUrl
  const type = searchParams.get('type') // newUsers | cityDistribution | preference | stickiness
  const range = searchParams.get('range') ?? '7' // 7 or 30

  const days = type === 'revenue' ? Math.min(Number(range) || 7, 90) : Math.min(Number(range) || 7, 30)
  const since = new Date()
  since.setDate(since.getDate() - days)
  since.setHours(0, 0, 0, 0)

  try {
    if (type === 'newUsers') {
      const rows = await prisma.$queryRaw<{ date: string; count: bigint }[]>`
        SELECT TO_CHAR("createdAt", 'YYYY-MM-DD') AS date, COUNT(*) AS count
        FROM "User"
        WHERE "createdAt" >= ${since}
        GROUP BY date
        ORDER BY date
      `
      const data = rows.map(r => ({ date: r.date, count: Number(r.count) }))
      return NextResponse.json({ data })
    }

    if (type === 'cityDistribution') {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      thirtyDaysAgo.setHours(0, 0, 0, 0)

      const rows = await prisma.$queryRaw<{ city: string; count: bigint }[]>`
        SELECT "location" AS city, COUNT(*) AS count
        FROM "User"
        WHERE "location" IS NOT NULL AND "location" != ''
          AND "createdAt" >= ${thirtyDaysAgo}
        GROUP BY "location"
        ORDER BY count DESC
        LIMIT 10
      `
      const data = rows.map(r => ({ city: r.city, count: Number(r.count) }))
      return NextResponse.json({ data })
    }

    if (type === 'preference') {
      // 用户喜好：各课程类型中学习人数前4的课程
      const [wordRows, sentenceRows, shadowingRows] = await Promise.all([
        prisma.$queryRaw<{ name: string; learners: bigint }[]>`
          SELECT ws."name", COUNT(DISTINCT wr."userId") AS learners
          FROM "WordRecord" wr
          JOIN "Word" w ON w."id" = wr."wordId"
          JOIN "WordSet" ws ON ws."id" = w."wordSetId"
          WHERE wr."createdAt" >= ${since}
          GROUP BY ws."id", ws."name"
          ORDER BY learners DESC
          LIMIT 4
        `,
        prisma.$queryRaw<{ name: string; learners: bigint }[]>`
          SELECT ss."name", COUNT(DISTINCT sr."userId") AS learners
          FROM "SentenceRecord" sr
          JOIN "Sentence" s ON s."id" = sr."sentenceId"
          JOIN "SentenceSet" ss ON ss."id" = s."sentenceSetId"
          WHERE sr."createdAt" >= ${since}
          GROUP BY ss."id", ss."name"
          ORDER BY learners DESC
          LIMIT 4
        `,
        prisma.$queryRaw<{ name: string; learners: bigint }[]>`
          SELECT ss."name", COUNT(DISTINCT sr."userId") AS learners
          FROM "ShadowingRecord" sr
          JOIN "Shadowing" s ON s."id" = sr."shadowingId"
          JOIN "ShadowingSet" ss ON ss."id" = s."shadowingSetId"
          WHERE sr."createdAt" >= ${since}
          GROUP BY ss."id", ss."name"
          ORDER BY learners DESC
          LIMIT 4
        `,
      ])

      return NextResponse.json({
        word: wordRows.map(r => ({ name: r.name, value: Number(r.learners) })),
        sentence: sentenceRows.map(r => ({ name: r.name, value: Number(r.learners) })),
        shadowing: shadowingRows.map(r => ({ name: r.name, value: Number(r.learners) })),
      })
    }

    if (type === 'stickiness') {
      // 用户粘性：各课程类型中学习时长前4的课程
      // 时长估算：每条记录按 1 分钟计算
      const [wordRows, sentenceRows, shadowingRows] = await Promise.all([
        prisma.$queryRaw<{ name: string; minutes: bigint }[]>`
          SELECT ws."name", COUNT(*) AS minutes
          FROM "WordRecord" wr
          JOIN "Word" w ON w."id" = wr."wordId"
          JOIN "WordSet" ws ON ws."id" = w."wordSetId"
          WHERE wr."createdAt" >= ${since}
          GROUP BY ws."id", ws."name"
          ORDER BY minutes DESC
          LIMIT 4
        `,
        prisma.$queryRaw<{ name: string; minutes: bigint }[]>`
          SELECT ss."name", COUNT(*) AS minutes
          FROM "SentenceRecord" sr
          JOIN "Sentence" s ON s."id" = sr."sentenceId"
          JOIN "SentenceSet" ss ON ss."id" = s."sentenceSetId"
          WHERE sr."createdAt" >= ${since}
          GROUP BY ss."id", ss."name"
          ORDER BY minutes DESC
          LIMIT 4
        `,
        prisma.$queryRaw<{ name: string; minutes: bigint }[]>`
          SELECT ss."name", COUNT(*) AS minutes
          FROM "ShadowingRecord" sr
          JOIN "Shadowing" s ON s."id" = sr."shadowingId"
          JOIN "ShadowingSet" ss ON ss."id" = s."shadowingSetId"
          WHERE sr."createdAt" >= ${since}
          GROUP BY ss."id", ss."name"
          ORDER BY minutes DESC
          LIMIT 4
        `,
      ])

      return NextResponse.json({
        word: wordRows.map(r => ({ name: r.name, value: Number(r.minutes) })),
        sentence: sentenceRows.map(r => ({ name: r.name, value: Number(r.minutes) })),
        shadowing: shadowingRows.map(r => ({ name: r.name, value: Number(r.minutes) })),
      })
    }

    if (type === 'revenue') {
      const rows = await prisma.$queryRaw<{ date: string; amount: bigint }[]>`
        SELECT TO_CHAR("createdAt", 'YYYY-MM-DD') AS date, SUM("amount") AS amount
        FROM "Order"
        WHERE "status" = 'paid' AND "createdAt" >= ${since}
        GROUP BY date
        ORDER BY date
      `
      const data = rows.map(r => ({ date: r.date, amount: Number(r.amount) / 100 }))
      return NextResponse.json({ data })
    }

    return NextResponse.json({ error: '无效的类型参数' }, { status: 400 })
  } catch (error) {
    console.error('Analytics API error:', error)
    return NextResponse.json({ error: '查询失败' }, { status: 500 })
  }
}
