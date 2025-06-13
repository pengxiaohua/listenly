import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { corpusId, index, text } = body
    if (!corpusId || index === undefined || !text) return NextResponse.json({ error: '参数缺失' }, { status: 400 })
    const sentence = await prisma.sentence.create({ data: { corpusId, index, text } })
    return NextResponse.json(sentence)
  } catch (error) {
    console.error('创建句子失败:', error)
    return NextResponse.json({ error: '创建句子失败' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
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
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const corpusId = searchParams.get('corpusId')
    const page = Number(searchParams.get('page') || '1')
    const pageSize = Number(searchParams.get('pageSize') || '20')
    const index = searchParams.get('index')

    if (!corpusId) return NextResponse.json({ error: '缺少corpusId' }, { status: 400 })

    const where = {
      corpusId: Number(corpusId),
      ...(index !== null ? { index: Number(index) } : {})
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
}
