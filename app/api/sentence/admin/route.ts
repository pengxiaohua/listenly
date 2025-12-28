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
    await prisma.sentence.delete({ where: { id: Number(id) } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('删除句子失败:', error)
    return NextResponse.json({ error: '删除句子失败' }, { status: 500 })
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
