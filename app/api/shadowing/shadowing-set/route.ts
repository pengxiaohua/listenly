import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import OSS from 'ali-oss'

// 公开 API: 获取跟读集列表(用于前端筛选)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const catalogFirstId = searchParams.get('catalogFirstId')
    const catalogSecondId = searchParams.get('catalogSecondId')
    const catalogThirdId = searchParams.get('catalogThirdId')

    const where: {
      catalogFirstId?: number
      catalogSecondId?: number | null
      catalogThirdId?: number | null
    } = {}

    if (catalogFirstId) where.catalogFirstId = parseInt(catalogFirstId)
    if (catalogSecondId) where.catalogSecondId = parseInt(catalogSecondId)
    if (catalogThirdId) where.catalogThirdId = parseInt(catalogThirdId)

    // 使用 any 兼容尚未生成的 Prisma Client 类型
    const shadowingSets = await (prisma as any).shadowingSet.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        isPro: true,
        coverImage: true,
        ossDir: true,
        catalogFirst: { select: { id: true, name: true } },
        catalogSecond: { select: { id: true, name: true } },
        catalogThird: { select: { id: true, name: true } },
        _count: { select: { shadowings: true } }
      },
      orderBy: { createdAt: 'desc' }
    })

    const client = new OSS({
      region: process.env.OSS_REGION!,
      accessKeyId: process.env.OSS_ACCESS_KEY_ID!,
      accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET!,
      bucket: process.env.OSS_BUCKET_NAME!,
      secure: true,
    })

    // 统计每个跟读集的去重学习人数
    const ids = shadowingSets.map((s: { id: number }) => s.id)
    let learnersMap = new Map<number, number>()
    if (ids.length > 0) {
      const rows = await prisma.$queryRaw<{ shadowingSetId: number, learners: number | bigint }[]>`
        SELECT ss."id" AS "shadowingSetId", COUNT(DISTINCT sr."userId") AS learners
        FROM "ShadowingRecord" sr
        JOIN "Shadowing" s ON s."id" = sr."shadowingId"
        JOIN "ShadowingSet" ss ON ss."id" = s."shadowingSetId"
        WHERE ss."id" IN (${Prisma.join(ids)})
        GROUP BY ss."id"`

      learnersMap = new Map(rows.map(r => [r.shadowingSetId, Number(r.learners)]))
    }

    const data = shadowingSets.map((s: any) => {
      let coverImage = s.coverImage as string | undefined
      try {
        if (coverImage && !/^https?:\/\//i.test(coverImage)) {
          coverImage = client.signatureUrl(coverImage, { expires: parseInt(process.env.OSS_EXPIRES || '3600', 10) })
        }
      } catch {}
      return {
        ...s,
        coverImage,
        learnersCount: learnersMap.get(s.id) ?? 0,
      }
    })

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('获取跟读集列表失败:', error)
    return NextResponse.json({ error: '获取列表失败' }, { status: 500 })
  }
}


