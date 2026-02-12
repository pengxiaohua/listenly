import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { shadowingId, score, rawResult, audioOssKey, ossUrl, sentence } = body

  if (!shadowingId) {
    return NextResponse.json({ error: '参数缺失' }, { status: 400 })
  }

  const userId = req.headers.get('x-user-id')
  if (!userId) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }

  // 限制：每个句子最多 3 次（仅统计实际录音，有 ossUrl 的记录）
  const perSentenceCount = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count FROM "ShadowingRecord"
    WHERE "userId" = ${userId} AND "shadowingId" = ${Number(shadowingId)} AND "ossUrl" IS NOT NULL
  `.then(rows => Number(rows[0]?.count ?? 0))
  if (perSentenceCount >= 3) {
    return NextResponse.json({ error: '每个句子跟读次数最多 3 次' }, { status: 429 })
  }

  // 限制：每天最多跟读句子 20 个（按当天唯一句子数，仅统计有录音的记录）
  const now = new Date()
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  const end = new Date(now)
  end.setHours(24, 0, 0, 0)

  const todaysDistinctIds = await prisma.$queryRaw<{ shadowingId: number }[]>`
    SELECT DISTINCT sr."shadowingId"
    FROM "ShadowingRecord" sr
    WHERE sr."userId" = ${userId}
      AND sr."createdAt" >= ${start}
      AND sr."createdAt" < ${end}
      AND sr."ossUrl" IS NOT NULL
  `
  const hasToday = todaysDistinctIds.some((r) => r.shadowingId === Number(shadowingId))
  if (!hasToday && todaysDistinctIds.length >= 20) {
    return NextResponse.json({ error: '试用阶段，每天最多跟读句子 20 个' }, { status: 429 })
  }

  await prisma.$executeRaw`INSERT INTO "ShadowingRecord" ("userId", "shadowingId", "score", "rawResult", "audioOssKey", "ossUrl", "shadowingSentence")
    VALUES (${userId}, ${Number(shadowingId)}, ${typeof score === 'number' ? Math.round(score) : null}, ${rawResult ?? null}, ${audioOssKey ?? null}, ${ossUrl ?? null}, ${sentence ?? null})`

  return NextResponse.json({ success: true })
}


