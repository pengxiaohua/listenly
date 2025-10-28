import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const shadowingSetSlug = searchParams.get('shadowingSet')

  if (!shadowingSetSlug) {
    return NextResponse.json({ error: '参数缺失' }, { status: 400 })
  }

  const userId = req.headers.get('x-user-id')
  if (!userId) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }

  try {
    const shadowingSet = await prisma.$queryRaw<{ id: number }[]>`
      SELECT id FROM "ShadowingSet" WHERE slug = ${shadowingSetSlug} LIMIT 1
    `.then(rows => rows[0])

    if (!shadowingSet) {
      return NextResponse.json({ error: '跟读集不存在' }, { status: 404 })
    }

    const totalRow = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint AS count FROM "Shadowing" WHERE "shadowingSetId" = ${shadowingSet.id}
    `
    const total = Number(totalRow[0]?.count ?? 0)

    const completedRow = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint AS count
      FROM "Shadowing" s
      WHERE s."shadowingSetId" = ${shadowingSet.id}
        AND EXISTS (
          SELECT 1 FROM "ShadowingRecord" sr
          WHERE sr."shadowingId" = s.id AND sr."userId" = ${userId}
        )
    `
    const completed = Number(completedRow[0]?.count ?? 0)

    return NextResponse.json({ total, completed })
  } catch (error) {
    console.error('获取进度统计失败:', error)
    return NextResponse.json({ error: '获取进度统计失败' }, { status: 500 })
  }
}


