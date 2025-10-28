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
    const shadowingSets = await prisma.$queryRaw<{
      id: number;
      name: string;
      slug: string;
      description: string | null;
      isPro: boolean;
      coverImage: string | null;
      ossDir: string | null;
      catalogFirstId: number | null;
      catalogSecondId: number | null;
      catalogThirdId: number | null;
      shadowingsCount: number | bigint;
      catalogFirstName: string | null;
      catalogSecondName: string | null;
      catalogThirdName: string | null;
    }[]>`
      SELECT ss.id, ss.name, ss.slug, ss.description, ss."isPro", ss."coverImage", ss."ossDir",
             ss."catalogFirstId", ss."catalogSecondId", ss."catalogThirdId",
             COALESCE((SELECT COUNT(1) FROM "Shadowing" s WHERE s."shadowingSetId" = ss.id), 0) AS "shadowingsCount",
             cf.name AS "catalogFirstName",
             cs.name AS "catalogSecondName",
             ct.name AS "catalogThirdName"
      FROM "ShadowingSet" ss
      LEFT JOIN "CatalogFirst" cf ON cf.id = ss."catalogFirstId"
      LEFT JOIN "CatalogSecond" cs ON cs.id = ss."catalogSecondId"
      LEFT JOIN "CatalogThird" ct ON ct.id = ss."catalogThirdId"
      WHERE 1=1
      ${catalogFirstId ? Prisma.sql`AND ss."catalogFirstId" = ${parseInt(catalogFirstId)}` : Prisma.sql``}
      ${catalogSecondId ? Prisma.sql`AND ss."catalogSecondId" = ${parseInt(catalogSecondId)}` : Prisma.sql``}
      ${catalogThirdId ? Prisma.sql`AND ss."catalogThirdId" = ${parseInt(catalogThirdId)}` : Prisma.sql``}
      ORDER BY ss."createdAt" DESC
    `

    const client = new OSS({
      region: process.env.OSS_REGION!,
      accessKeyId: process.env.OSS_ACCESS_KEY_ID!,
      accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET!,
      bucket: process.env.OSS_BUCKET_NAME!,
      secure: true,
    })

    // 统计每个跟读集的去重学习人数
    const ids = shadowingSets.map((s) => s.id)
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
        catalogFirst: s.catalogFirstId ? { id: s.catalogFirstId, name: s.catalogFirstName ?? '' } : null,
        catalogSecond: s.catalogSecondId ? { id: s.catalogSecondId, name: s.catalogSecondName ?? '' } : null,
        catalogThird: s.catalogThirdId ? { id: s.catalogThirdId, name: s.catalogThirdName ?? '' } : null,
        _count: { shadowings: Number(s.shadowingsCount) },
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


