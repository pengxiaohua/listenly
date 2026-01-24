import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAdminAuth } from '@/lib/auth'

export const POST = withAdminAuth(async (req: NextRequest) => {
  try {
    const body = await req.json()
    const { sentenceSetId, index, text } = body
    if (!sentenceSetId || index === undefined || !text) return NextResponse.json({ error: '参数缺失' }, { status: 400 })
    const sentence = await prisma.sentence.create({ data: { sentenceSetId, index, text } })
    return NextResponse.json(sentence)
  } catch (error) {
    console.error('创建句子失败:', error)
    return NextResponse.json({ error: '创建句子失败' }, { status: 500 })
  }
});

export const DELETE = withAdminAuth(async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: '缺少id' }, { status: 400 })

    const sentenceId = Number(id)

    // 先检查句子是否存在
    const sentence = await prisma.sentence.findUnique({
      where: { id: sentenceId },
      select: { id: true }
    })

    if (!sentence) {
      return NextResponse.json({ error: '句子不存在' }, { status: 404 })
    }

    // 事务内清理关联数据，避免外键约束导致删除失败
    await prisma.$transaction(async (tx) => {
      // 删除句子练习记录
      await tx.sentenceRecord.deleteMany({
        where: { sentenceId },
      })
      // 删除生词本中与这个句子相关的记录
      await tx.vocabulary.deleteMany({
        where: { 
          sentenceId,
          type: 'sentence'
        },
      })
      // 删除句子
      await tx.sentence.delete({
        where: { id: sentenceId },
      })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('删除句子失败:', error)
    
    // 提供更详细的错误信息
    const prismaError = error as { code?: string; meta?: unknown; message?: string }
    if (prismaError?.code === 'P2003') {
      return NextResponse.json({ 
        error: '删除失败：存在关联数据，请先清理相关记录',
        details: prismaError.meta
      }, { status: 400 })
    }
    
    return NextResponse.json({ 
      error: '删除句子失败',
      details: prismaError?.message || '未知错误'
    }, { status: 500 })
  }
});

export const PUT = withAdminAuth(async (req: NextRequest) => {
  try {
    const body = await req.json()
    const { id, text, translation } = body
    if (!id) return NextResponse.json({ error: '缺少id' }, { status: 400 })

    const updateData: { text?: string; translation?: string | null } = {}
    if (text !== undefined) updateData.text = text
    if (translation !== undefined) updateData.translation = translation

    const sentence = await prisma.sentence.update({
      where: { id: Number(id) },
      data: updateData
    })
    return NextResponse.json({ success: true, data: sentence })
  } catch (error) {
    console.error('更新句子失败:', error)
    return NextResponse.json({ error: '更新句子失败' }, { status: 500 })
  }
});

export const GET = withAdminAuth(async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url)
    const sentenceSetId = searchParams.get('sentenceSetId')
    const page = Number(searchParams.get('page') || '1')
    const pageSize = Number(searchParams.get('pageSize') || '50')
    const search = searchParams.get('search')

    if (!sentenceSetId) return NextResponse.json({ error: '缺少sentenceSetId' }, { status: 400 })

    const where: {
      sentenceSetId: number
      text?: { contains: string }
    } = {
      sentenceSetId: Number(sentenceSetId)
    }

    // 如果提供了搜索关键词，进行模糊搜索
    if (search && search.trim()) {
      where.text = {
        contains: search.trim()
      }
    }

    // 获取总数
    const total = await prisma.sentence.count({ where })

    // 获取分页数据
    const sentences = await prisma.sentence.findMany({
      where,
      orderBy: { index: 'asc' },
      skip: (page - 1) * pageSize,
      take: pageSize
    })

    return NextResponse.json({
      success: true,
      data: sentences,
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize)
      }
    })
  } catch (error) {
    console.error('获取句子列表失败:', error)
    return NextResponse.json({ error: '获取句子列表失败' }, { status: 500 })
  }
});
