import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAdminAuth } from '@/lib/auth'

// 获取完整的目录树
export const GET = withAdminAuth(async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') // 'WORD' | 'SENTENCE'

    if (!type || (type !== 'WORD' && type !== 'SENTENCE')) {
      return NextResponse.json({ error: 'type参数必须是WORD或SENTENCE' }, { status: 400 })
    }

    const catalogFirsts = await prisma.catalogFirst.findMany({
      where: { type: type as 'WORD' | 'SENTENCE' },
      orderBy: { displayOrder: 'asc' },
      include: {
        seconds: {
          where: { type: type as 'WORD' | 'SENTENCE' },
          orderBy: { displayOrder: 'asc' },
          include: {
            thirds: {
              where: { type: type as 'WORD' | 'SENTENCE' },
              orderBy: { displayOrder: 'asc' }
            }
          }
        }
      }
    })

    return NextResponse.json({ success: true, data: catalogFirsts })
  } catch (error) {
    console.error('获取目录树失败:', error)
    return NextResponse.json({ error: '获取目录树失败' }, { status: 500 })
  }
})

// 创建目录项
export const POST = withAdminAuth(async (req: NextRequest) => {
  try {
    const body = await req.json()
    const { level, name, slug, type, description, displayOrder, firstId, secondId } = body

    if (!level || !name || !slug || !type) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 })
    }

    if (type !== 'WORD' && type !== 'SENTENCE') {
      return NextResponse.json({ error: 'type必须是WORD或SENTENCE' }, { status: 400 })
    }

    let result
    if (level === 'first') {
      result = await prisma.catalogFirst.create({
        data: { name, slug, type, displayOrder: displayOrder || 0 }
      })
    } else if (level === 'second') {
      if (!firstId) return NextResponse.json({ error: '缺少firstId' }, { status: 400 })
      result = await prisma.catalogSecond.create({
        data: { name, slug, type, description, displayOrder: displayOrder || 0, firstId }
      })
    } else if (level === 'third') {
      if (!secondId) return NextResponse.json({ error: '缺少secondId' }, { status: 400 })
      result = await prisma.catalogThird.create({
        data: { name, slug, type, description, displayOrder: displayOrder || 0, secondId }
      })
    } else {
      return NextResponse.json({ error: '无效的level参数' }, { status: 400 })
    }

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('创建目录失败:', error)
    return NextResponse.json({ error: '创建目录失败' }, { status: 500 })
  }
})

// 更新目录项
export const PUT = withAdminAuth(async (req: NextRequest) => {
  try {
    const body = await req.json()
    const { level, id, name, slug, type, description, displayOrder } = body

    if (!level || !id) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 })
    }

    if (type && type !== 'WORD' && type !== 'SENTENCE') {
      return NextResponse.json({ error: 'type必须是WORD或SENTENCE' }, { status: 400 })
    }

    let result

    if (level === 'first') {
      const updateData: { name?: string, slug?: string, type?: string, displayOrder?: number } = {}
      if (name) updateData.name = name
      if (slug) updateData.slug = slug
      if (type !== undefined) updateData.type = type
      if (displayOrder !== undefined) updateData.displayOrder = displayOrder

      result = await prisma.catalogFirst.update({
        where: { id },
        data: updateData
      })
    } else if (level === 'second') {
      const updateData: { name?: string, slug?: string, type?: string, description?: string | null, displayOrder?: number } = {}
      if (name) updateData.name = name
      if (slug) updateData.slug = slug
      if (type !== undefined) updateData.type = type
      if (description !== undefined) updateData.description = description
      if (displayOrder !== undefined) updateData.displayOrder = displayOrder

      result = await prisma.catalogSecond.update({
        where: { id },
        data: updateData
      })
    } else if (level === 'third') {
      const updateData: { name?: string, slug?: string, type?: string, description?: string | null, displayOrder?: number } = {}
      if (name) updateData.name = name
      if (slug) updateData.slug = slug
      if (type !== undefined) updateData.type = type
      if (description !== undefined) updateData.description = description
      if (displayOrder !== undefined) updateData.displayOrder = displayOrder

      result = await prisma.catalogThird.update({
        where: { id },
        data: updateData
      })
    } else {
      return NextResponse.json({ error: '无效的level参数' }, { status: 400 })
    }

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('更新目录失败:', error)
    return NextResponse.json({ error: '更新目录失败' }, { status: 500 })
  }
})

// 删除目录项
export const DELETE = withAdminAuth(async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url)
    const level = searchParams.get('level')
    const id = searchParams.get('id')

    if (!level || !id) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 })
    }

    const numId = parseInt(id)

    if (level === 'first') {
      await prisma.catalogFirst.delete({ where: { id: numId } })
    } else if (level === 'second') {
      await prisma.catalogSecond.delete({ where: { id: numId } })
    } else if (level === 'third') {
      await prisma.catalogThird.delete({ where: { id: numId } })
    } else {
      return NextResponse.json({ error: '无效的level参数' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('删除目录失败:', error)
    return NextResponse.json({ error: '删除目录失败' }, { status: 500 })
  }
})
