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

  // 使用 upsert 确保每个用户的每个句子只有一条记录
  await prisma.sentenceRecord.upsert({
    where: {
      userId_sentenceId: {
        userId: userId,
        sentenceId: Number(sentenceId),
      }
    },
    update: {
      isCorrect: Boolean(isCorrect),
      errorCount: Number(errorCount),
    },
    create: {
      userId: userId,
      sentenceId: Number(sentenceId),
      isCorrect: Boolean(isCorrect),
      errorCount: Number(errorCount),
    }
  })

  return NextResponse.json({ success: true })
}

// 处理单词错误时增加errorCount
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

  // 查找现有记录
  const existingRecord = await prisma.sentenceRecord.findUnique({
    where: {
      userId_sentenceId: {
        userId: userId,
        sentenceId: Number(sentenceId),
      }
    }
  })

  // 使用 upsert 更新或创建记录
  await prisma.sentenceRecord.upsert({
    where: {
      userId_sentenceId: {
        userId: userId,
        sentenceId: Number(sentenceId),
      }
    },
    update: {
      errorCount: existingRecord ? existingRecord.errorCount + 1 : 1,
      isCorrect: false, // 有错误就标记为未正确
    },
    create: {
      userId: userId,
      sentenceId: Number(sentenceId),
      isCorrect: false,
      errorCount: 1,
    }
  })

  return NextResponse.json({ success: true })
}
