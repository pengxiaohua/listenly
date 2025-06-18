import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const corpusId = searchParams.get('corpusId')

  if (!corpusId) {
    return NextResponse.json({ error: '参数缺失' }, { status: 400 })
  }

  const userId = req.headers.get('x-user-id')
  if (!userId) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }

  const progress = await prisma.userProgress.findFirst({
    where: {
      userId: userId,
      corpusId: Number(corpusId),
    },
  })

  if (!progress) {
    // 没有进度，默认返回index为0
    return NextResponse.json({
      userId,
      corpusId: Number(corpusId),
      sentenceIndex: 0,
      updatedAt: null,
    })
  }

  return NextResponse.json(progress)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { corpusId, sentenceIndex } = body

  if (!corpusId || sentenceIndex === undefined) {
    return NextResponse.json({ error: '参数缺失' }, { status: 400 })
  }

  const userId = req.headers.get('x-user-id')
  if (!userId) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }

  await prisma.userProgress.upsert({
    where: {
      userId_corpusId: {
        userId: userId,
        corpusId: Number(corpusId),
      }
    },
    update: { sentenceIndex: Number(sentenceIndex) },
    create: {
      userId: userId,
      corpusId: Number(corpusId),
      sentenceIndex: Number(sentenceIndex),
    }
  })

  return NextResponse.json({ success: true })
}
