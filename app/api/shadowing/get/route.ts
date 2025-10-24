import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const shadowingSetSlug = searchParams.get('shadowingSet')

  if (!shadowingSetSlug) {
    return NextResponse.json({ error: '参数缺失' }, { status: 400 })
  }

  const userId = req.headers.get('x-user-id')
  if (!userId) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }

  try {
    const shadowingSet = await (prisma as any).shadowingSet.findUnique({
      where: { slug: shadowingSetSlug },
      select: { id: true, name: true, ossDir: true },
    })

    if (!shadowingSet) {
      return NextResponse.json({ error: '跟读集不存在' }, { status: 404 })
    }

    const item = await (prisma as any).shadowing.findFirst({
      where: {
        shadowingSetId: shadowingSet.id,
        NOT: {
          shadowingRecords: {
            some: {
              userId,
            },
          },
        },
      },
      orderBy: { id: 'asc' },
      select: { id: true, text: true, translation: true },
    })

    if (!item) {
      return NextResponse.json({ completed: true })
    }

    return NextResponse.json({
      id: item.id,
      text: item.text,
      translation: item.translation,
      shadowingSet,
    })
  } catch (error) {
    console.error('获取跟读失败:', error)
    return NextResponse.json({ error: '获取失败' }, { status: 500 })
  }
}


