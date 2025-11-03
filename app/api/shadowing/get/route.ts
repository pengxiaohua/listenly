import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const shadowingSetSlug = searchParams.get('shadowingSet')
  const groupIdParam = searchParams.get('groupId')

  if (!shadowingSetSlug) {
    return NextResponse.json({ error: '参数缺失' }, { status: 400 })
  }

  const userId = req.headers.get('x-user-id')
  if (!userId) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }

  try {
    const shadowingSet = await prisma.$queryRaw<{ id: number; name: string; ossDir: string | null }[]>`
      SELECT id, name, "ossDir" FROM "ShadowingSet" WHERE slug = ${shadowingSetSlug} LIMIT 1
    `.then(rows => rows[0])

    if (!shadowingSet) {
      return NextResponse.json({ error: '跟读集不存在' }, { status: 404 })
    }

    const item = await prisma.shadowing.findFirst({
      where: {
        shadowingSetId: shadowingSet.id,
        ...(groupIdParam ? { shadowingGroupId: Number(groupIdParam) } : {}),
        shadowingRecords: {
          none: {
            userId,
          }
        }
      },
      orderBy: { id: 'asc' },
      select: { id: true, text: true, translation: true }
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


