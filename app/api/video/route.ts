import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createOssClient, getSignedOssUrl } from '@/lib/oss'
import { isPro } from '@/lib/membership'

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
        where: isNumeric ? { id: parseInt(id), status: 'ACTIVE' } : { uuid: id, status: 'ACTIVE' },
      })
      if (!video) {
        return NextResponse.json({ error: '视频不存在' }, { status: 404 })
      }

      // 会员校验：会员视频仅会员可查看
      if (video.isPro) {
        const userId = req.cookies.get('userId')?.value
        if (!userId) {
          return NextResponse.json(
            { success: false, error: '需购买会员才能查看该视频' },
            { status: 403 }
          )
        }

        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { membershipExpiresAt: true },
        })
        if (!isPro(user?.membershipExpiresAt)) {
          return NextResponse.json(
            { success: false, error: '需购买会员才能查看该视频' },
            { status: 403 }
          )
        }
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

    // 分页参数
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
    const pageSize = Math.min(
      50,
      Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10) || 20)
    )

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { status: 'ACTIVE' }
    if (category) where.category = category
    if (level) where.level = level

    // 排序：免费视频在前、会员视频在后；组内按发布时间/热度排序，并以 id 逆序兜底
    const primarySort: Record<string, string> =
      sortBy === 'popular' ? { viewCount: 'desc' } : { createdAt: 'desc' }
    const orderBy = [{ isPro: 'asc' as const }, primarySort, { id: 'desc' as const }]

    const [total, videos] = await Promise.all([
      prisma.video.count({ where }),
      prisma.video.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
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
      }),
    ])

    const items = videos.map((v) => ({
      ...v,
      coverImageUrl: getSignedOssUrl(client, v.coverImage),
    }))

    return NextResponse.json({
      success: true,
      data: items,
      total,
      page,
      pageSize,
      hasMore: page * pageSize < total,
    })
  } catch (error) {
    console.error('获取视频失败:', error)
    return NextResponse.json({ error: '获取失败' }, { status: 500 })
  }
}
