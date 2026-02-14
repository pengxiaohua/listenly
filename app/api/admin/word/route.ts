import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAdminAuth } from '@/lib/auth'

// 获取单词列表
export const GET = withAdminAuth(async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url)
    const wordSetId = searchParams.get('wordSetId')
    const page = Number(searchParams.get('page') || '1')
    const pageSize = Number(searchParams.get('pageSize') || '50')
    const search = searchParams.get('search')

    if (!wordSetId) return NextResponse.json({ error: '缺少wordSetId' }, { status: 400 })

    const where: {
      wordSetId: number
      OR?: Array<{ word?: { contains: string }; translation?: { contains: string } }>
    } = {
      wordSetId: Number(wordSetId)
    }

    // 如果提供了搜索关键词，进行模糊搜索（搜索单词或翻译）
    if (search && search.trim()) {
      where.OR = [
        { word: { contains: search.trim() } },
        { translation: { contains: search.trim() } }
      ]
    }

    // 获取总数
    const total = await prisma.word.count({ where })

    // 获取分页数据
    const words = await prisma.word.findMany({
      where,
      orderBy: { index: 'asc' },
      skip: (page - 1) * pageSize,
      take: pageSize
    })

    return NextResponse.json({
      success: true,
      data: words,
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize)
      }
    })
  } catch (error) {
    console.error('获取单词列表失败:', error)
    return NextResponse.json({ error: '获取单词列表失败' }, { status: 500 })
  }
})

// 更新单词
export const PUT = withAdminAuth(async (req: NextRequest) => {
  try {
    const body = await req.json()
    const { id, word, translation, phoneticUS } = body
    if (!id) return NextResponse.json({ error: '缺少id' }, { status: 400 })

    const updateData: { word?: string; translation?: string; phoneticUS?: string } = {}
    if (word !== undefined) updateData.word = word
    if (translation !== undefined) updateData.translation = translation
    if (phoneticUS !== undefined) updateData.phoneticUS = phoneticUS

    const updatedWord = await prisma.word.update({
      where: { id: String(id) },
      data: updateData
    })
    return NextResponse.json({ success: true, data: updatedWord })
  } catch (error) {
    console.error('更新单词失败:', error)
    return NextResponse.json({ error: '更新单词失败' }, { status: 500 })
  }
})

// 删除单词
export const DELETE = withAdminAuth(async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: '缺少id' }, { status: 400 })

    const wordId = String(id)

    // 先检查单词是否存在
    const word = await prisma.word.findUnique({
      where: { id: wordId },
      select: { id: true }
    })

    if (!word) {
      return NextResponse.json({ error: '单词不存在' }, { status: 404 })
    }

    // 事务内清理关联数据，避免外键约束导致删除失败
    await prisma.$transaction(async (tx) => {
      // 删除单词练习记录
      await tx.wordRecord.deleteMany({
        where: { wordId },
      })
      // 删除生词本中与这个单词相关的记录
      await tx.vocabulary.deleteMany({
        where: {
          wordId,
          type: 'word'
        },
      })
      // 删除单词
      await tx.word.delete({
        where: { id: wordId },
      })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('删除单词失败:', error)

    // 提供更详细的错误信息
    const prismaError = error as { code?: string; meta?: unknown; message?: string }
    if (prismaError?.code === 'P2003') {
      return NextResponse.json({
        error: '删除失败：存在关联数据，请先清理相关记录',
        details: prismaError.meta
      }, { status: 400 })
    }

    return NextResponse.json({
      error: '删除单词失败',
      details: prismaError?.message || '未知错误'
    }, { status: 500 })
  }
})
