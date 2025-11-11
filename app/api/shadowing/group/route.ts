import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

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

    // 首先检查是否有 TYPE 或 UNIT 类型的分组
    const existingGroups = await prisma.shadowingGroup.findMany({
      where: { shadowingSetId: setId },
      orderBy: { order: 'asc' },
      select: { id: true, name: true, kind: true, order: true }
    })

    const hasTypeOrUnitGroups = existingGroups.some(g => g.kind === 'TYPE' || g.kind === 'UNIT')

    // 如果没有 TYPE 或 UNIT 分组，检查是否有未分组的跟读，如果有则按 SIZE 创建分组
    if (!hasTypeOrUnitGroups) {
      const ungroupedShadowings = await prisma.shadowing.findMany({
        where: {
          shadowingSetId: setId,
          shadowingGroupId: null
        },
        orderBy: { index: 'asc' },
        select: { id: true, index: true }
      })

      // 如果有未分组的跟读，按每 20 个创建一个 SIZE 分组
      if (ungroupedShadowings.length > 0) {
        const groupSize = 20
        const maxOrder = existingGroups.length > 0
          ? Math.max(...existingGroups.map(g => g.order))
          : 0

        await prisma.$transaction(async (tx) => {
          for (let i = 0; i < ungroupedShadowings.length; i += groupSize) {
            const groupIndex = Math.floor(i / groupSize) + 1
            const groupName = `第${groupIndex}组`
            const groupSlug = slugify(groupName)
            const order = maxOrder + groupIndex

            // 检查是否已存在该分组
            let group = await tx.shadowingGroup.findFirst({
              where: { shadowingSetId: setId, slug: groupSlug }
            })

            if (!group) {
              group = await tx.shadowingGroup.create({
                data: {
                  shadowingSetId: setId!,
                  name: groupName,
                  slug: groupSlug,
                  kind: 'SIZE',
                  order
                }
              })
            }

            // 将跟读分配到该分组
            const shadowingsInGroup = ungroupedShadowings.slice(i, i + groupSize)
            for (let j = 0; j < shadowingsInGroup.length; j++) {
              await tx.shadowing.update({
                where: { id: shadowingsInGroup[j].id },
                data: {
                  shadowingGroupId: group.id,
                  groupIndex: j + 1
                }
              })
            }
          }
        })

        // 重新获取所有分组（包括新创建的）
        const allGroups = await prisma.shadowingGroup.findMany({
          where: { shadowingSetId: setId },
          orderBy: { order: 'asc' },
          select: { id: true, name: true, kind: true, order: true }
        })

        const result = [] as Array<{ id: number; name: string; kind: string; order: number; total: number; done: number; lastStudiedAt: string | null }>
        for (const g of allGroups) {
          const total = await prisma.shadowing.count({ where: { shadowingGroupId: g.id } })
          let done = 0
          let lastStudiedAt: string | null = null
          if (userId) {
            done = await prisma.shadowingRecord.count({
              where: {
                userId,
                shadowing: { shadowingGroupId: g.id },
              },
            })
            // 获取该小组中最后一次学习的时间
            const lastRecord = await prisma.shadowingRecord.findFirst({
              where: {
                userId,
                shadowing: { shadowingGroupId: g.id },
              },
              orderBy: { createdAt: 'desc' },
              select: { createdAt: true },
            })
            if (lastRecord) {
              lastStudiedAt = lastRecord.createdAt.toISOString()
            }
          }
          result.push({ id: g.id, name: g.name, kind: g.kind, order: g.order, total, done, lastStudiedAt })
        }

        return NextResponse.json({ success: true, data: result })
      }
    }

    // 如果有 TYPE 或 UNIT 分组，或者没有未分组的跟读，直接返回现有分组
    const result = [] as Array<{ id: number; name: string; kind: string; order: number; total: number; done: number; lastStudiedAt: string | null }>
    for (const g of existingGroups) {
      const total = await prisma.shadowing.count({ where: { shadowingGroupId: g.id } })
      let done = 0
      let lastStudiedAt: string | null = null
      if (userId) {
        done = await prisma.shadowingRecord.count({
          where: {
            userId,
            shadowing: { shadowingGroupId: g.id },
          },
        })
        // 获取该小组中最后一次学习的时间
        const lastRecord = await prisma.shadowingRecord.findFirst({
          where: {
            userId,
            shadowing: { shadowingGroupId: g.id },
          },
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true },
        })
        if (lastRecord) {
          lastStudiedAt = lastRecord.createdAt.toISOString()
        }
      }
      result.push({ id: g.id, name: g.name, kind: g.kind, order: g.order, total, done, lastStudiedAt })
    }

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('获取跟读分组失败:', error)
    return NextResponse.json({ success: false, error: '获取分组失败' }, { status: 500 })
  }
}


