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

    if (!wordSetId) return NextResponse.json({ error: '缺少wordSetId' }, { status: 400 })

    const where = {
      wordSetId: Number(wordSetId)
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
    await prisma.word.delete({ where: { id: String(id) } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('删除单词失败:', error)
    return NextResponse.json({ error: '删除单词失败' }, { status: 500 })
  }
})
