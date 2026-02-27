import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/blog/view?slug=xxx
 * 获取文章阅读量（支持单篇或批量查询）
 * - ?slug=xxx          获取单篇文章阅读量
 * - ?slugs=a,b,c       批量获取多篇文章阅读量
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const slug = searchParams.get('slug')
    const slugs = searchParams.get('slugs')

    // 单篇查询
    if (slug) {
      const record = await prisma.blogViewCount.findUnique({
        where: { slug },
      })
      return NextResponse.json({ slug, count: record?.count ?? 0 })
    }

    // 批量查询
    if (slugs) {
      const slugList = slugs.split(',').filter(Boolean)
      const records = await prisma.blogViewCount.findMany({
        where: { slug: { in: slugList } },
      })
      const countMap: Record<string, number> = {}
      for (const s of slugList) {
        countMap[s] = records.find((r) => r.slug === s)?.count ?? 0
      }
      return NextResponse.json({ counts: countMap })
    }

    return NextResponse.json({ error: '请提供 slug 或 slugs 参数' }, { status: 400 })
  } catch (error) {
    console.error('获取博客阅读量失败:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

/**
 * POST /api/blog/view
 * 增加文章阅读量（+1）
 * body: { slug: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { slug } = body

    if (!slug || typeof slug !== 'string') {
      return NextResponse.json({ error: '请提供有效的 slug' }, { status: 400 })
    }

    // upsert: 存在则 +1，不存在则创建（初始为 1）
    const record = await prisma.blogViewCount.upsert({
      where: { slug },
      update: { count: { increment: 1 } },
      create: { slug, count: 1 },
    })

    return NextResponse.json({ slug, count: record.count })
  } catch (error) {
    console.error('更新博客阅读量失败:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
