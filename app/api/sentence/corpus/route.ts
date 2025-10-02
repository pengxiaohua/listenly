import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAdminAuth } from '@/lib/auth'

export async function GET() {
  try {
    const sentenceSets = await prisma.sentenceSet.findMany({
      orderBy: { id: 'asc' }
    })
    return NextResponse.json(sentenceSets)
  } catch (error) {
    console.error('获取语料库列表失败:', error)
    return NextResponse.json({ error: '获取语料库列表失败' }, { status: 500 })
  }
}

export const POST = withAdminAuth(async (req: NextRequest) => {
  try {
    const body = await req.json()
    const { name, slug, description, ossDir, catalogFirstId, catalogSecondId, catalogThirdId, isPro, coverImage } = body
    if (!name) return NextResponse.json({ error: '缺少name' }, { status: 400 })
    if (!slug) return NextResponse.json({ error: '缺少slug' }, { status: 400 })
    if (!ossDir) return NextResponse.json({ error: '缺少ossDir' }, { status: 400 })
    if (!catalogFirstId) return NextResponse.json({ error: '缺少catalogFirstId' }, { status: 400 })

    const sentenceSet = await prisma.sentenceSet.create({
      data: {
        name,
        slug,
        description,
        ossDir,
        catalogFirstId,
        catalogSecondId,
        catalogThirdId,
        isPro: isPro || false,
        coverImage
      }
    })
    return NextResponse.json(sentenceSet)
  } catch (error) {
    console.error('创建语料库失败:', error)
    return NextResponse.json({ error: '创建语料库失败' }, { status: 500 })
  }
});

export const PUT = withAdminAuth(async (req: NextRequest) => {
  try {
    const body = await req.json()
    const { id, name, slug, description, ossDir, catalogFirstId, catalogSecondId, catalogThirdId, isPro, coverImage } = body
    if (!id) return NextResponse.json({ error: '缺少id' }, { status: 400 })

    const sentenceSet = await prisma.sentenceSet.update({
      where: { id },
      data: {
        name,
        slug,
        description,
        ossDir,
        catalogFirstId,
        catalogSecondId,
        catalogThirdId,
        isPro,
        coverImage
      }
    })
    return NextResponse.json(sentenceSet)
  } catch (error) {
    console.error('更新语料库失败:', error)
    return NextResponse.json({ error: '更新语料库失败' }, { status: 500 })
  }
});

export const DELETE = withAdminAuth(async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: '缺少id' }, { status: 400 })
    await prisma.sentenceSet.delete({ where: { id: Number(id) } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('删除语料库失败:', error)
    return NextResponse.json({ error: '删除语料库失败' }, { status: 500 })
  }
});
