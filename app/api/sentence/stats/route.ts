import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const sentenceSetSlug = searchParams.get('sentenceSet')

  if (!sentenceSetSlug) {
    return NextResponse.json({ error: '参数缺失' }, { status: 400 })
  }

  const userId = req.headers.get('x-user-id')
  if (!userId) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }

  try {
    const sentenceSet = await prisma.sentenceSet.findUnique({
      where: { slug: sentenceSetSlug },
      select: { id: true }
    })

    if (!sentenceSet) {
      return NextResponse.json({ error: '句集不存在' }, { status: 404 })
    }

    // 获取句集中的总句子数
    const totalSentences = await prisma.sentence.count({
      where: { sentenceSetId: sentenceSet.id }
    })

    // 获取用户已完成的句子数（不管对错都算）
    const completedSentences = await prisma.sentence.count({
      where: {
        sentenceSetId: sentenceSet.id,
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
