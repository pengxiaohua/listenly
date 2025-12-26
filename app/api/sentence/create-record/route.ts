import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { sentenceId, isCorrect, errorCount = 0 } = body

  if (!sentenceId || isCorrect === undefined) {
    return NextResponse.json({ error: '参数缺失' }, { status: 400 })
  }

  const userId = req.headers.get('x-user-id')
  if (!userId) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }

  // 每次拼写完成都创建一条新记录，以记录练习过程
  await prisma.sentenceRecord.create({
    data: {
      userId: userId,
      sentenceId: Number(sentenceId),
      isCorrect: Boolean(isCorrect),
      errorCount: Number(errorCount),
    }
  })

  return NextResponse.json({ success: true })
}

// 处理单词错误时，尝试更新当前练习中的记录或创建新记录
export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { sentenceId } = body

  if (!sentenceId) {
    return NextResponse.json({ error: '参数缺失' }, { status: 400 })
  }

  const userId = req.headers.get('x-user-id')
  if (!userId) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }

  // 查找最近 30 分钟内且尚未完成的记录
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000)
  const existingRecord = await prisma.sentenceRecord.findFirst({
    where: {
        userId: userId,
        sentenceId: Number(sentenceId),
      isCorrect: false,
      createdAt: {
        gt: thirtyMinutesAgo
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  })

  if (existingRecord) {
    await prisma.sentenceRecord.update({
      where: { id: existingRecord.id },
      data: {
        errorCount: existingRecord.errorCount + 1,
      }
    })
  } else {
    await prisma.sentenceRecord.create({
      data: {
      userId: userId,
      sentenceId: Number(sentenceId),
      isCorrect: false,
      errorCount: 1,
    }
  })
  }

  return NextResponse.json({ success: true })
}
