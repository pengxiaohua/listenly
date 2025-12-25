import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const { sentenceSetSlug, groupId } = await req.json()
    const userId = req.headers.get('x-user-id')

    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    if (!sentenceSetSlug || !groupId) {
      return NextResponse.json({ error: '参数缺失' }, { status: 400 })
    }

    // 找到该用户在该分组下所有已正确完成的练习记录并重置
    // 获取该分组下的所有句子ID
    const sentenceSet = await prisma.sentenceSet.findUnique({
      where: { slug: sentenceSetSlug },
      select: { id: true }
    })

    if (!sentenceSet) {
      return NextResponse.json({ error: '句集不存在' }, { status: 404 })
    }

    await prisma.sentenceRecord.updateMany({
      where: {
        userId: userId,
        sentence: {
          sentenceSetId: sentenceSet.id,
          sentenceGroupId: parseInt(groupId)
        },
        archived: false
      },
      data: {
        archived: true
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('重置进度失败:', error)
    return NextResponse.json({ error: '重置进度失败' }, { status: 500 })
  }
}

