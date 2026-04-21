/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAdminAuth } from '@/lib/auth'

// 获取视频列表
export const GET = withAdminAuth(async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '20')
    const category = searchParams.get('category')

    const where: any = {}
    if (category) where.category = category

    const [total, videos] = await Promise.all([
      prisma.video.count({ where }),
      prisma.video.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ])

    return NextResponse.json({
      success: true,
      data: { items: videos, total, page, pageSize },
    })
  } catch (error) {
    console.error('获取视频列表失败:', error)
    return NextResponse.json({ error: '获取列表失败' }, { status: 500 })
  }
})

// 创建视频
export const POST = withAdminAuth(async (req: NextRequest) => {
  try {
    const body = await req.json()
    const {
      title, titleZh, author, description, category, level,
      duration, tags, coverImage, videoOssKey, youtubeId, subtitles, isPro, publishedAt,
    } = body

    if (!title || !category || !videoOssKey) {
      return NextResponse.json({ error: '缺少必要参数（标题、分类、视频文件）' }, { status: 400 })
    }

    const video = await prisma.video.create({
      data: {
        title,
        titleZh: titleZh || null,
        author: author || null,
        description: description || null,
        category,
        level: level || null,
        duration: duration ? parseInt(duration) : null,
        tags: tags || [],
        coverImage: coverImage || null,
        videoOssKey,
        youtubeId: youtubeId || null,
        subtitles: subtitles || null,
        isPro: isPro || false,
        publishedAt: publishedAt ? new Date(publishedAt) : null,
      },
    })

    return NextResponse.json({ success: true, data: video })
  } catch (error) {
    console.error('创建视频失败:', error)
    return NextResponse.json({ error: '创建失败' }, { status: 500 })
  }
})


// 更新视频
export const PUT = withAdminAuth(async (req: NextRequest) => {
  try {
    const body = await req.json()
    const { id, ...rest } = body

    if (!id) {
      return NextResponse.json({ error: '缺少id' }, { status: 400 })
    }

    const updateData: any = {}
    if (rest.title !== undefined) updateData.title = rest.title
    if (rest.titleZh !== undefined) updateData.titleZh = rest.titleZh || null
    if (rest.author !== undefined) updateData.author = rest.author || null
    if (rest.description !== undefined) updateData.description = rest.description || null
    if (rest.category !== undefined) updateData.category = rest.category
    if (rest.level !== undefined) updateData.level = rest.level || null
    if (rest.duration !== undefined) updateData.duration = rest.duration ? parseInt(rest.duration) : null
    if (rest.tags !== undefined) updateData.tags = rest.tags || []
    if (rest.coverImage !== undefined) updateData.coverImage = rest.coverImage || null
    if (rest.videoOssKey !== undefined) updateData.videoOssKey = rest.videoOssKey
    if (rest.youtubeId !== undefined) updateData.youtubeId = rest.youtubeId || null
    if (rest.subtitles !== undefined) updateData.subtitles = rest.subtitles || null
    if (rest.isPro !== undefined) updateData.isPro = rest.isPro
    if (rest.publishedAt !== undefined) updateData.publishedAt = rest.publishedAt ? new Date(rest.publishedAt) : null

    const video = await prisma.video.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ success: true, data: video })
  } catch (error) {
    console.error('更新视频失败:', error)
    return NextResponse.json({ error: '更新失败' }, { status: 500 })
  }
})

// 删除视频
export const DELETE = withAdminAuth(async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: '缺少id' }, { status: 400 })
    }

    await prisma.video.delete({ where: { id: parseInt(id) } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('删除视频失败:', error)
    return NextResponse.json({ error: '删除失败' }, { status: 500 })
  }
})
