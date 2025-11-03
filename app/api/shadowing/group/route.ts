import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/shadowing/group?shadowingSet=slug | ?setId=123
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const slug = searchParams.get('shadowingSet')
    const setIdParam = searchParams.get('setId')
    const userId = req.headers.get('x-user-id') || undefined

    let setId: number | null = null
    if (setIdParam) setId = parseInt(setIdParam)
    if (!setId && slug) {
      const s = await prisma.shadowingSet.findUnique({ where: { slug }, select: { id: true } })
      if (!s) return NextResponse.json({ success: true, data: [] })
      setId = s.id
    }
    if (!setId) return NextResponse.json({ success: true, data: [] })

    const groups = await prisma.shadowingGroup.findMany({
      where: { shadowingSetId: setId },
      orderBy: { order: 'asc' },
      select: { id: true, name: true, kind: true, order: true }
    })

    const result = [] as Array<{ id: number; name: string; kind: string; order: number; total: number; done: number }>
    for (const g of groups) {
      const total = await prisma.shadowing.count({ where: { shadowingGroupId: g.id } })
      let done = 0
      if (userId) {
        done = await prisma.shadowingRecord.count({
          where: {
            userId,
            shadowing: { shadowingGroupId: g.id },
          },
        })
      }
      result.push({ id: g.id, name: g.name, kind: g.kind, order: g.order, total, done })
    }

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('获取跟读分组失败:', error)
    return NextResponse.json({ success: false, error: '获取分组失败' }, { status: 500 })
  }
}


