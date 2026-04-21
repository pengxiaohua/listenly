import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createOssClient, getSignedOssUrl } from '@/lib/oss'

// 公开接口：获取视频列表 / 单个视频详情
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    const client = createOssClient()

    // 获取单个视频详情
    if (id) {
      // 支持 uuid 或 numeric id
      const isNumeric = /^\d+$/.test(id)
      const video = await prisma.video.findFirst({
        where: isNumeric ? { id: parseInt(id) } : { uuid: id },
      })
      if (!video) {
        return NextResponse.json({ error: '视频不存在' }, { status: 404 })
      }

      // 增加浏览量
      await prisma.video.update({
        where: { id: video.id },
        data: { viewCount: { increment: 1 } },
      })

      return NextResponse.json({
        success: true,
        data: {
          ...video,
          coverImageUrl: getSignedOssUrl(client, video.coverImage),
          videoUrl: client.signatureUrl(video.videoOssKey, {
            expires: parseInt(process.env.OSS_EXPIRES || '3600', 10),
          }),
        },
      })
    }

    // 获取视频列表
    const category = searchParams.get('category')
    const level = searchParams.get('level')
    const sortBy = searchParams.get('sort') || 'latest'

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {}
    if (category) where.category = category
    if (level) where.level = level

    let orderBy: Record<string, string> = { createdAt: 'desc' }
    if (sortBy === 'popular') orderBy = { viewCount: 'desc' }

    const videos = await prisma.video.findMany({
      where,
      orderBy,
      select: {
        id: true,
        uuid: true,
        title: true,
        titleZh: true,
        author: true,
        description: true,
        category: true,
        level: true,
        duration: true,
        tags: true,
        coverImage: true,
        videoOssKey: true,
        isPro: true,
        viewCount: true,
        createdAt: true,
      },
    })

    const items = videos.map((v) => ({
      ...v,
      coverImageUrl: getSignedOssUrl(client, v.coverImage),
    }))

    return NextResponse.json({ success: true, data: items })
  } catch (error) {
    console.error('获取视频失败:', error)
    return NextResponse.json({ error: '获取失败' }, { status: 500 })
  }
}
