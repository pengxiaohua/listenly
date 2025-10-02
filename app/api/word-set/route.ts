import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// 公开 API: 获取单词集列表(用于前端筛选)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const catalogFirstId = searchParams.get('catalogFirstId')
    const catalogSecondId = searchParams.get('catalogSecondId')
    const catalogThirdId = searchParams.get('catalogThirdId')

    const where: {
      catalogFirstId?: number
      catalogSecondId?: number | null
      catalogThirdId?: number | null
    } = {}

    if (catalogFirstId) {
      where.catalogFirstId = parseInt(catalogFirstId)
    }

    if (catalogSecondId) {
      where.catalogSecondId = parseInt(catalogSecondId)
    } else if (catalogFirstId) {
      // 如果只选择了一级目录,返回该一级目录下的所有单词集
      // 不限制 catalogSecondId
    }

    if (catalogThirdId) {
      where.catalogThirdId = parseInt(catalogThirdId)
    }

    const wordSets = await prisma.wordSet.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        isPro: true,
        coverImage: true,
        catalogFirst: {
          select: { id: true, name: true }
        },
        catalogSecond: {
          select: { id: true, name: true }
        },
        catalogThird: {
          select: { id: true, name: true }
        },
        _count: {
          select: { words: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({
      success: true,
      data: wordSets
    })
  } catch (error) {
    console.error('获取单词集列表失败:', error)
    return NextResponse.json({ error: '获取列表失败' }, { status: 500 })
  }
}

