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
  const perSentenceCount = await (prisma as any).shadowingRecord.count({
    where: { userId, shadowingId: Number(shadowingId), ossUrl: { not: null } }
  })
  if (perSentenceCount >= 3) {
    return NextResponse.json({ error: '每个句子跟读次数最多 3 次' }, { status: 429 })
  }

  // 限制：每天最多跟读句子 5 个（按当天唯一句子数，仅统计有录音的记录）
  const now = new Date()
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  const end = new Date(now)
  end.setHours(24, 0, 0, 0)

  const todaysDistinct = await (prisma as any).shadowingRecord.findMany({
    where: {
      userId,
      createdAt: { gte: start, lt: end },
      ossUrl: { not: null },
    },
    distinct: ['shadowingId'],
    select: { shadowingId: true },
  })
  const hasToday = todaysDistinct.some((r: any) => r.shadowingId === Number(shadowingId))
  if (!hasToday && todaysDistinct.length >= 5) {
    return NextResponse.json({ error: '试用阶段，每天最多跟读句子 5 个' }, { status: 429 })
  }

  await (prisma as any).shadowingRecord.create({
    data: {
      userId: userId,
      shadowingId: Number(shadowingId),
      score: typeof score === 'number' ? Math.round(score) : null,
      rawResult: rawResult ?? null,
      audioOssKey: audioOssKey ?? null,
      ossUrl: ossUrl ?? null,
      shadowingSentence: sentence ?? null,
    }
  })

  return NextResponse.json({ success: true })
}


