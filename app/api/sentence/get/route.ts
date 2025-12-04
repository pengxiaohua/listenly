import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const sentenceSetSlug = searchParams.get('sentenceSet')
  const groupIdParam = searchParams.get('groupId')

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

    // 获取一个按顺序的未完成句子
    const sentence = await prisma.sentence.findFirst({
      where: {
        sentenceSetId: sentenceSet.id,
        ...(groupIdParam ? { sentenceGroupId: parseInt(groupIdParam) } : {}),
        // 不在用户已完成的句子中（必须是正确完成才算）
        NOT: {
          sentenceRecords: {
            some: {
              userId: userId,
              isCorrect: true
            }
          }
        }
      },
      orderBy: groupIdParam
        ? { groupIndex: 'asc' } // 有分组时按组内顺序排序
        : { index: 'asc' } // 无分组时按集合内顺序排序
    })

    if (!sentence) {
      return NextResponse.json({ completed: true })
    }

    return NextResponse.json(sentence)
  } catch (error) {
    console.error('获取句子失败:', error)
    return NextResponse.json({ error: '获取句子失败' }, { status: 500 })
  }
}
