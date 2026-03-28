import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAdminAuth } from '@/lib/auth'

// 获取跟读列表（分页 + 搜索）
export const GET = withAdminAuth(async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url)
    const shadowingSetId = searchParams.get('shadowingSetId')
    const page = Number(searchParams.get('page') || '1')
    const pageSize = Number(searchParams.get('pageSize') || '50')
    const search = searchParams.get('search')

    if (!shadowingSetId) return NextResponse.json({ error: '缺少shadowingSetId' }, { status: 400 })

    const where: {
      shadowingSetId: number
      text?: { contains: string }
    } = {
      shadowingSetId: Number(shadowingSetId)
    }

    if (search && search.trim()) {
      where.text = { contains: search.trim() }
    }

    const total = await prisma.shadowing.count({ where })

    const shadowings = await prisma.shadowing.findMany({
      where,
      orderBy: { index: 'asc' },
      skip: (page - 1) * pageSize,
      take: pageSize
    })

    return NextResponse.json({
      success: true,
      data: shadowings,
      pagination: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
    })
  } catch (error) {
    console.error('获取跟读列表失败:', error)
    return NextResponse.json({ error: '获取跟读列表失败' }, { status: 500 })
  }
})

// 更新跟读内容
export const PUT = withAdminAuth(async (req: NextRequest) => {
  try {
    const body = await req.json()
    const { id, text, translation } = body
    if (!id) return NextResponse.json({ error: '缺少id' }, { status: 400 })

    const updateData: { text?: string; translation?: string | null } = {}
    if (text !== undefined) updateData.text = text
    if (translation !== undefined) updateData.translation = translation

    const shadowing = await prisma.shadowing.update({
      where: { id: Number(id) },
      data: updateData
    })
    return NextResponse.json({ success: true, data: shadowing })
  } catch (error) {
    console.error('更新跟读失败:', error)
    return NextResponse.json({ error: '更新跟读失败' }, { status: 500 })
  }
})

// 删除跟读内容
export const DELETE = withAdminAuth(async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: '缺少id' }, { status: 400 })

    const shadowingId = Number(id)

    const shadowing = await prisma.shadowing.findUnique({
      where: { id: shadowingId },
      select: { id: true }
    })

    if (!shadowing) {
      return NextResponse.json({ error: '跟读内容不存在' }, { status: 404 })
    }

    await prisma.$transaction(async (tx) => {
      await tx.shadowingRecord.deleteMany({ where: { shadowingId } })
      await tx.shadowing.delete({ where: { id: shadowingId } })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('删除跟读失败:', error)
    return NextResponse.json({ error: '删除跟读失败' }, { status: 500 })
  }
})
