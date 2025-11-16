import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAdminAuth } from '@/lib/auth'

// 获取所有 SentenceSet
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

    const [total, sentenceSets] = await Promise.all([
      prisma.sentenceSet.count({ where }),
      prisma.sentenceSet.findMany({
        where,
        include: {
          catalogFirst: true,
          catalogSecond: true,
          catalogThird: true,
          _count: {
            select: { sentences: true }
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
        items: sentenceSets,
        total,
        page,
        pageSize
      }
    })
  } catch (error) {
    console.error('获取 SentenceSet 列表失败:', error)
    return NextResponse.json({ error: '获取列表失败' }, { status: 500 })
  }
})

// 创建 SentenceSet
export const POST = withAdminAuth(async (req: NextRequest) => {
  try {
    const body = await req.json()
    const { name, slug, description, coverImage, isPro, catalogFirstId, catalogSecondId, catalogThirdId, ossDir } = body

    if (!name || !slug || !catalogFirstId || !ossDir) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 })
    }

    const sentenceSet = await prisma.sentenceSet.create({
      data: {
        name,
        slug,
        description,
        coverImage,
        isPro: isPro || false,
        catalogFirstId,
        catalogSecondId,
        catalogThirdId,
        ossDir
      },
      include: {
        catalogFirst: true,
        catalogSecond: true,
        catalogThird: true
      }
    })

    return NextResponse.json({ success: true, data: sentenceSet })
  } catch (error) {
    console.error('创建 SentenceSet 失败:', error)
    return NextResponse.json({ error: '创建失败' }, { status: 500 })
  }
})

// 更新 SentenceSet
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

    const sentenceSet = await prisma.sentenceSet.update({
      where: { id },
      data: updateData,
      include: {
        catalogFirst: true,
        catalogSecond: true,
        catalogThird: true
      }
    })

    return NextResponse.json({ success: true, data: sentenceSet })
  } catch (error) {
    console.error('更新 SentenceSet 失败:', error)
    return NextResponse.json({ error: '更新失败' }, { status: 500 })
  }
})

// 删除 SentenceSet
export const DELETE = withAdminAuth(async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: '缺少id' }, { status: 400 })
    }

    const setId = parseInt(id)

    // 事务内清理关联数据，避免外键约束导致删除失败
    await prisma.$transaction(async (tx) => {
      // 找出该集合下的所有句子ID
      const sentences = await tx.sentence.findMany({
        where: { sentenceSetId: setId },
        select: { id: true },
      })
      const sentenceIds = sentences.map(s => s.id)

      if (sentenceIds.length > 0) {
        // 删除句子练习记录
        await tx.sentenceRecord.deleteMany({
          where: { sentenceId: { in: sentenceIds } },
        })
        // 删除生词本中与这些句子相关的记录
        await tx.vocabulary.deleteMany({
          where: { sentenceId: { in: sentenceIds } },
        })
        // 删除句子
        await tx.sentence.deleteMany({
          where: { id: { in: sentenceIds } },
        })
      }

      // 删除 SIZE/UNIT 等分组
      await tx.sentenceGroup.deleteMany({
        where: { sentenceSetId: setId },
      })

      // 删除与该集合相关的音频任务与导入任务（及其子项）
      // await tx.audioTask.deleteMany({
      //   where: { sentenceSetId: setId },
      // })
      // await tx.importJob.deleteMany({
      //   where: { sentenceSetId: setId },
      // })

      // 最后删除集合本身
      await tx.sentenceSet.delete({
        where: { id: setId },
      })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('删除 SentenceSet 失败:', error)
    return NextResponse.json({ error: '删除失败' }, { status: 500 })
  }
})
