/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAdminAuth } from '@/lib/auth'

// 获取所有 ShadowingSet
export const GET = withAdminAuth(async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '20')
    const catalogFirstId = searchParams.get('catalogFirstId')
    const catalogSecondId = searchParams.get('catalogSecondId')
    const catalogThirdId = searchParams.get('catalogThirdId')

    const where: {
      catalogFirstId?: number
      catalogSecondId?: number
      catalogThirdId?: number
    } = {}

    if (catalogFirstId) where.catalogFirstId = parseInt(catalogFirstId)
    if (catalogSecondId) where.catalogSecondId = parseInt(catalogSecondId)
    if (catalogThirdId) where.catalogThirdId = parseInt(catalogThirdId)

    const [total, shadowingSets] = await Promise.all([
      (prisma as any).shadowingSet.count({ where }),
      (prisma as any).shadowingSet.findMany({
        where,
        include: {
          catalogFirst: true,
          catalogSecond: true,
          catalogThird: true,
          _count: {
            select: { shadowings: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      })
    ])

    return NextResponse.json({
      success: true,
      data: {
        items: shadowingSets,
        total,
        page,
        pageSize
      }
    })
  } catch (error) {
    console.error('获取 ShadowingSet 列表失败:', error)
    return NextResponse.json({ error: '获取列表失败' }, { status: 500 })
  }
})

// 创建 ShadowingSet
export const POST = withAdminAuth(async (req: NextRequest) => {
  try {
    const body = await req.json()
    const { name, slug, description, coverImage, isPro, catalogFirstId, catalogSecondId, catalogThirdId, ossDir } = body

    if (!name || !slug || !catalogFirstId) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 })
    }

    const shadowingSet = await (prisma as any).shadowingSet.create({
      data: {
        name,
        slug,
        description,
        coverImage,
        isPro: isPro || false,
        catalogFirstId,
        catalogSecondId,
        catalogThirdId,
        ossDir: ossDir || `shadowings/${slug}`
      },
      include: {
        catalogFirst: true,
        catalogSecond: true,
        catalogThird: true
      }
    })

    return NextResponse.json({ success: true, data: shadowingSet })
  } catch (error) {
    console.error('创建 ShadowingSet 失败:', error)
    return NextResponse.json({ error: '创建失败' }, { status: 500 })
  }
})

// 更新 ShadowingSet
export const PUT = withAdminAuth(async (req: NextRequest) => {
  try {
    const body = await req.json()
    const { id, name, slug, description, coverImage, isPro, catalogFirstId, catalogSecondId, catalogThirdId, ossDir } = body

    if (!id) {
      return NextResponse.json({ error: '缺少id' }, { status: 400 })
    }

    const updateData: {
      name?: string
      slug?: string
      description?: string | null
      coverImage?: string | null
      isPro?: boolean
      catalogFirstId?: number
      catalogSecondId?: number | null
      catalogThirdId?: number | null
      ossDir?: string
    } = {}

    if (name !== undefined) updateData.name = name
    if (slug !== undefined) updateData.slug = slug
    if (description !== undefined) updateData.description = description
    if (coverImage !== undefined) updateData.coverImage = coverImage
    if (isPro !== undefined) updateData.isPro = isPro
    if (catalogFirstId !== undefined) updateData.catalogFirstId = catalogFirstId
    if (catalogSecondId !== undefined) updateData.catalogSecondId = catalogSecondId
    if (catalogThirdId !== undefined) updateData.catalogThirdId = catalogThirdId
    if (ossDir !== undefined) updateData.ossDir = ossDir

    const shadowingSet = await (prisma as any).shadowingSet.update({
      where: { id },
      data: updateData,
      include: {
        catalogFirst: true,
        catalogSecond: true,
        catalogThird: true
      }
    })

    return NextResponse.json({ success: true, data: shadowingSet })
  } catch (error) {
    console.error('更新 ShadowingSet 失败:', error)
    return NextResponse.json({ error: '更新失败' }, { status: 500 })
  }
})

// 删除 ShadowingSet
export const DELETE = withAdminAuth(async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: '缺少id' }, { status: 400 })
    }

    await (prisma as any).shadowingSet.delete({ where: { id: parseInt(id) } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('删除 ShadowingSet 失败:', error)
    return NextResponse.json({ error: '删除失败' }, { status: 500 })
  }
})


