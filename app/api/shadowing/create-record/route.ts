import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { shadowingId, recognized, score, rawResult, audioOssKey } = body

  if (!shadowingId) {
    return NextResponse.json({ error: '参数缺失' }, { status: 400 })
  }

  const userId = req.headers.get('x-user-id')
  if (!userId) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }

  await (prisma as any).shadowingRecord.create({
    data: {
      userId: userId,
      shadowingId: Number(shadowingId),
      recognized: recognized ?? null,
      score: score ?? null,
      rawResult: rawResult ?? null,
      audioOssKey: audioOssKey ?? null,
    }
  })

  return NextResponse.json({ success: true })
}


