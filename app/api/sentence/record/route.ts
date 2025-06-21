import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { sentenceId, userInput, correct, errorCount = 0 } = body

  if (!sentenceId || userInput === undefined || correct === undefined) {
    return NextResponse.json({ error: '参数缺失' }, { status: 400 })
  }

  const userId = req.headers.get('x-user-id')
  if (!userId) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }

  await prisma.sentenceRecord.create({
    data: {
      userId: userId,
      sentenceId: Number(sentenceId),
      userInput,
      correct: Boolean(correct),
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

  // 查找或创建句子记录
  const existingRecord = await prisma.sentenceRecord.findFirst({
    where: {
      userId: userId,
      sentenceId: Number(sentenceId),
    },
    orderBy: {
      createdAt: 'desc'
    }
  })

  if (existingRecord) {
    // 如果存在记录，更新errorCount
    await prisma.sentenceRecord.update({
      where: {
        id: existingRecord.id
      },
      data: {
        errorCount: existingRecord.errorCount + 1
      }
    })
  } else {
    // 如果不存在记录，创建一个新记录
    await prisma.sentenceRecord.create({
      data: {
        userId: userId,
        sentenceId: Number(sentenceId),
        userInput: '', // 临时为空，等待最终提交
        correct: false,
        errorCount: 1,
      }
    })
  }

  return NextResponse.json({ success: true })
}
