import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import OSS from 'ali-oss'

const DEFAULT_PAGE_SIZE = 20
const MAX_PAGE_SIZE = 50

function parsePositiveInt(value: string | null, fallback: number, max?: number) {
  const parsed = Number.parseInt(value || '', 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return max ? Math.min(parsed, max) : parsed
}

function parseListParam(value: string | null) {
  return (value || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
}

// 公开 API: 获取跟读集列表(用于前端筛选)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const catalogFirstId = searchParams.get('catalogFirstId')
    const catalogSecondId = searchParams.get('catalogSecondId')
    const catalogThirdId = searchParams.get('catalogThirdId')
    const slug = searchParams.get('slug')
    const levels = parseListParam(searchParams.get('level'))
    const proFilters = parseListParam(searchParams.get('pro'))
    const sort = searchParams.get('sort') || 'popular'
    const requestedPage = parsePositiveInt(searchParams.get('page'), 1)
    const requestedPageSize = parsePositiveInt(searchParams.get('pageSize'), DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE)
    const page = slug ? 1 : requestedPage
    const pageSize = slug ? 1 : requestedPageSize
    const skip = (page - 1) * pageSize
    // 由于 /api/shadowing/shadowing-set 是公开路由，middleware 不会添加 x-user-id 请求头
    // 需要直接从 cookie 中获取 userId
    const userId = req.headers.get('x-user-id') || req.cookies.get('userId')?.value || undefined

    const rawWhere: Prisma.Sql[] = []

    if (catalogFirstId) rawWhere.push(Prisma.sql`ss."catalogFirstId" = ${parseInt(catalogFirstId)}`)
    if (catalogSecondId) rawWhere.push(Prisma.sql`ss."catalogSecondId" = ${parseInt(catalogSecondId)}`)
    if (catalogThirdId) rawWhere.push(Prisma.sql`ss."catalogThirdId" = ${parseInt(catalogThirdId)}`)
    if (slug) rawWhere.push(Prisma.sql`ss."slug" = ${slug}`)
    if (levels.length > 0) rawWhere.push(Prisma.sql`ss."level" IN (${Prisma.join(levels)})`)

    const wantsPro = proFilters.includes('pro')
    const wantsFree = proFilters.includes('free')
    if (wantsPro !== wantsFree) rawWhere.push(Prisma.sql`ss."isPro" = ${wantsPro}`)

    const whereSql = rawWhere.length > 0
      ? Prisma.sql`WHERE ${Prisma.join(rawWhere, ' AND ')}`
      : Prisma.sql``

    const orderSql =
      sort === 'name'
        ? Prisma.sql`ORDER BY ss."name" ASC`
        : sort === 'latest'
          ? Prisma.sql`ORDER BY ss."createdAt" DESC`
          : Prisma.sql`ORDER BY learners DESC, ss."createdAt" DESC`

    type ShadowingSetRow = {
      id: number;
      name: string;
      slug: string;
      description: string | null;
      isPro: boolean;
      level: string | null;
      coverImage: string | null;
      ossDir: string | null;
      catalogFirstId: number | null;
      catalogSecondId: number | null;
      catalogThirdId: number | null;
      shadowingsCount: number | bigint;
      catalogFirstName: string | null;
      catalogSecondName: string | null;
      catalogThirdName: string | null;
      createdAt: Date;
    }

    const countRows = await prisma.$queryRaw<{ total: number | bigint }[]>`
      SELECT COUNT(1) AS total
      FROM "ShadowingSet" ss
      ${whereSql}`
    const total = Number(countRows[0]?.total || 0)

    let shadowingSets = await prisma.$queryRaw<ShadowingSetRow[]>`
      SELECT ss.id, ss.name, ss.slug, ss.description, ss."isPro", ss."level", ss."coverImage", ss."ossDir",
             ss."catalogFirstId", ss."catalogSecondId", ss."catalogThirdId", ss."createdAt",
             COALESCE((SELECT COUNT(1) FROM "Shadowing" s WHERE s."shadowingSetId" = ss.id), 0) AS "shadowingsCount",
             cf.name AS "catalogFirstName",
             cs.name AS "catalogSecondName",
             ct.name AS "catalogThirdName",
             COUNT(DISTINCT sr."userId") AS learners
      FROM "ShadowingSet" ss
      LEFT JOIN "CatalogFirst" cf ON cf.id = ss."catalogFirstId"
      LEFT JOIN "CatalogSecond" cs ON cs.id = ss."catalogSecondId"
      LEFT JOIN "CatalogThird" ct ON ct.id = ss."catalogThirdId"
      LEFT JOIN "Shadowing" sl ON sl."shadowingSetId" = ss.id
      LEFT JOIN "ShadowingRecord" sr ON sr."shadowingId" = sl.id
      ${whereSql}
      GROUP BY ss.id, cf.name, cs.name, ct.name
      ${orderSql}
      LIMIT ${pageSize} OFFSET ${skip}
    `

    const pageDataLength = shadowingSets.length

    if (userId && page === 1 && !slug) {
      const lastWhereSql = rawWhere.length > 0
        ? Prisma.sql`WHERE sr."userId" = ${userId} AND ${Prisma.join(rawWhere, ' AND ')}`
        : Prisma.sql`WHERE sr."userId" = ${userId}`

      const lastRows = await prisma.$queryRaw<{ id: number }[]>`
        SELECT ss.id
        FROM "ShadowingRecord" sr
        JOIN "Shadowing" s ON s."id" = sr."shadowingId"
        JOIN "ShadowingSet" ss ON ss."id" = s."shadowingSetId"
        ${lastWhereSql}
        GROUP BY ss.id
        ORDER BY MAX(sr."createdAt") DESC
        LIMIT 1`

      const lastStudiedSetId = lastRows[0]?.id
      if (lastStudiedSetId && !shadowingSets.some(s => s.id === lastStudiedSetId)) {
        const [lastStudiedSet] = await prisma.$queryRaw<ShadowingSetRow[]>`
          SELECT ss.id, ss.name, ss.slug, ss.description, ss."isPro", ss."level", ss."coverImage", ss."ossDir",
                 ss."catalogFirstId", ss."catalogSecondId", ss."catalogThirdId", ss."createdAt",
                 COALESCE((SELECT COUNT(1) FROM "Shadowing" s WHERE s."shadowingSetId" = ss.id), 0) AS "shadowingsCount",
                 cf.name AS "catalogFirstName",
                 cs.name AS "catalogSecondName",
                 ct.name AS "catalogThirdName",
                 COUNT(DISTINCT sr."userId") AS learners
          FROM "ShadowingSet" ss
          LEFT JOIN "CatalogFirst" cf ON cf.id = ss."catalogFirstId"
          LEFT JOIN "CatalogSecond" cs ON cs.id = ss."catalogSecondId"
          LEFT JOIN "CatalogThird" ct ON ct.id = ss."catalogThirdId"
          LEFT JOIN "Shadowing" sl ON sl."shadowingSetId" = ss.id
          LEFT JOIN "ShadowingRecord" sr ON sr."shadowingId" = sl.id
          WHERE ss.id = ${lastStudiedSetId}
          GROUP BY ss.id, cf.name, cs.name, ct.name
          LIMIT 1`

        if (lastStudiedSet) {
          shadowingSets = [lastStudiedSet, ...shadowingSets]
        }
      }
    }

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

    // 统计每个跟读集中用户已完成的跟读数
    const doneMap = new Map<number, number>()
    const lastStudiedMap = new Map<number, string>()
    if (userId && ids.length > 0) {
      const doneRows = await prisma.$queryRaw<{ shadowingSetId: number; done: number | bigint }[]>`
        SELECT s."shadowingSetId" AS "shadowingSetId", COUNT(DISTINCT sr."shadowingId") AS done
        FROM "ShadowingRecord" sr
        JOIN "Shadowing" s ON s."id" = sr."shadowingId"
        WHERE sr."userId" = ${userId}
          AND s."shadowingSetId" IN (${Prisma.join(ids)})
        GROUP BY s."shadowingSetId"`
      for (const r of doneRows) {
        doneMap.set(r.shadowingSetId, Number(r.done))
      }

      // 查询用户每个跟读集的最近学习时间
      const lastRows = await prisma.$queryRaw<{ shadowingSetId: number; lastStudied: Date }[]>`
        SELECT s."shadowingSetId" AS "shadowingSetId", MAX(sr."createdAt") AS "lastStudied"
        FROM "ShadowingRecord" sr
        JOIN "Shadowing" s ON s."id" = sr."shadowingId"
        WHERE sr."userId" = ${userId}
          AND s."shadowingSetId" IN (${Prisma.join(ids)})
        GROUP BY s."shadowingSetId"`
      for (const r of lastRows) {
        lastStudiedMap.set(r.shadowingSetId, r.lastStudied.toISOString())
      }
    }

    const data = shadowingSets.map((s: ShadowingSetRow) => {
      let coverImage = s.coverImage as string | undefined
      try {
        if (coverImage && !/^https?:\/\//i.test(coverImage)) {
          coverImage = client.signatureUrl(coverImage, { expires: parseInt(process.env.OSS_EXPIRES || '3600', 10) })
        }
      } catch {}
      return {
        id: s.id,
        name: s.name,
        slug: s.slug,
        description: s.description,
        isPro: s.isPro,
        level: s.level,
        coverImage,
        ossDir: s.ossDir,
        createdTime: s.createdAt.toISOString(),
        catalogFirst: s.catalogFirstId ? { id: s.catalogFirstId, name: s.catalogFirstName ?? '' } : null,
        catalogSecond: s.catalogSecondId ? { id: s.catalogSecondId, name: s.catalogSecondName ?? '' } : null,
        catalogThird: s.catalogThirdId ? { id: s.catalogThirdId, name: s.catalogThirdName ?? '' } : null,
        _count: {
          shadowings: Number(s.shadowingsCount),
          done: doneMap.get(s.id) ?? 0,
        },
        learnersCount: learnersMap.get(s.id) ?? 0,
        lastStudiedAt: lastStudiedMap.get(s.id) ?? null,
      }
    })

    return NextResponse.json({
      success: true,
      data,
      total,
      page,
      pageSize,
      hasMore: skip + pageDataLength < total,
    })
  } catch (error) {
    console.error('获取跟读集列表失败:', error)
    return NextResponse.json({ error: '获取列表失败' }, { status: 500 })
  }
}
