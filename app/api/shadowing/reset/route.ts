import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const { shadowingSet: slug, groupId } = await req.json()
    const userId = req.headers.get('x-user-id')

    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    if (!slug || !groupId) {
      return NextResponse.json({ error: '参数缺失' }, { status: 400 })
    }

    const set = await prisma.shadowingSet.findUnique({
      where: { slug },
      select: { id: true }
    })

    if (!set) {
      return NextResponse.json({ error: '跟读集不存在' }, { status: 404 })
    }

    // 删除该用户在该分组下的所有跟读记录
    await prisma.shadowingRecord.deleteMany({
      where: {
        userId,
        shadowing: {
          shadowingSetId: set.id,
          shadowingGroupId: groupId
        }
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('重置跟读进度失败:', error)
    return NextResponse.json({ error: '重置进度失败' }, { status: 500 })
  }
}
