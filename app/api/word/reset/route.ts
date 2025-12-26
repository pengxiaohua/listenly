import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const { wordSetSlug, groupId } = await req.json()
    const userId = req.headers.get('x-user-id')

    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    if (!wordSetSlug || !groupId) {
      return NextResponse.json({ error: '参数缺失' }, { status: 400 })
    }

    // 找到该词集
    const wordSet = await prisma.wordSet.findUnique({
      where: { slug: wordSetSlug },
      select: { id: true }
    })

    if (!wordSet) {
      return NextResponse.json({ error: '词集不存在' }, { status: 404 })
    }

    // 将该用户在该分组/集下的所有活跃记录标记为已存档
    // 如果是虚拟分组（负数ID），目前不支持按分组重置，或者需要按 index 范围重置
    // 这里先处理真实分组和词集整体
    
    const where: any = {
      userId: userId,
      archived: false,
      word: {
        wordSetId: wordSet.id
      }
    }

    if (parseInt(groupId) > 0) {
      where.word.wordGroupId = parseInt(groupId)
    } else if (parseInt(groupId) < 0) {
      // 虚拟分组重置逻辑：按 index 范围
      const virtualOrder = -parseInt(groupId)
      const groupSize = 20
      const start = (virtualOrder - 1) * groupSize
      const end = virtualOrder * groupSize
      where.word.index = {
        gte: start,
        lt: end
      }
    }

    await prisma.wordRecord.updateMany({
      where,
      data: {
        archived: true
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('重置单词进度失败:', error)
    return NextResponse.json({ error: '重置进度失败' }, { status: 500 })
  }
}

