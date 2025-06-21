import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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

  try {
    // 获取语料库中的总句子数
    const totalSentences = await prisma.sentence.count({
      where: { corpusId: Number(corpusId) }
    })

    // 获取用户已完成的句子数（不管对错都算）
    const completedSentences = await prisma.sentence.count({
      where: {
        corpusId: Number(corpusId),
        sentenceRecords: {
          some: {
            userId,
            // 获取用户回答正确的句子数
            // correct: true
            // userInput不为空的句子
            userInput: {
              not: ''
            }
          }
        }
      }
    })

    return NextResponse.json({
      total: totalSentences,
      completed: completedSentences
    })
  } catch (error) {
    console.error('获取进度统计失败:', error)
    return NextResponse.json({ error: '获取进度统计失败' }, { status: 500 })
  }
}
