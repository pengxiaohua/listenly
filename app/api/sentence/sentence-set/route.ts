import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { createOssClient, getSignedOssUrl } from '@/lib/oss'

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

// ========== 公开 API: 获取句子集列表(用于前端筛选) ==========
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
    const page = parsePositiveInt(searchParams.get('page'), 1)
    const pageSize = parsePositiveInt(searchParams.get('pageSize'), DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE)
    const skip = (page - 1) * pageSize
    const userId = req.headers.get('x-user-id') || req.cookies.get('userId')?.value || undefined

    const where: Prisma.SentenceSetWhereInput = {}
    const rawWhere: Prisma.Sql[] = []

    if (catalogFirstId) {
      where.catalogFirstId = parseInt(catalogFirstId)
      rawWhere.push(Prisma.sql`ss."catalogFirstId" = ${parseInt(catalogFirstId)}`)
    }

    if (catalogSecondId) {
      where.catalogSecondId = parseInt(catalogSecondId)
      rawWhere.push(Prisma.sql`ss."catalogSecondId" = ${parseInt(catalogSecondId)}`)
    }

    if (catalogThirdId) {
      where.catalogThirdId = parseInt(catalogThirdId)
      rawWhere.push(Prisma.sql`ss."catalogThirdId" = ${parseInt(catalogThirdId)}`)
    }

    if (slug) {
      where.slug = slug
      rawWhere.push(Prisma.sql`ss."slug" = ${slug}`)
    }

    if (levels.length > 0) {
      where.level = { in: levels }
      rawWhere.push(Prisma.sql`ss."level" IN (${Prisma.join(levels)})`)
    }

    const wantsPro = proFilters.includes('pro')
    const wantsFree = proFilters.includes('free')
    if (wantsPro !== wantsFree) {
      where.isPro = wantsPro
      rawWhere.push(Prisma.sql`ss."isPro" = ${wantsPro}`)
    }

    const total = await prisma.sentenceSet.count({ where })

    const select = {
      id: true,
      name: true,
      slug: true,
      description: true,
      isPro: true,
      level: true,
      coverImage: true,
      ossDir: true,
      createdAt: true,
      catalogFirst: { select: { id: true, name: true } },
      catalogSecond: { select: { id: true, name: true } },
      catalogThird: { select: { id: true, name: true } },
      _count: { select: { sentences: true } }
    } satisfies Prisma.SentenceSetSelect

    let sentenceSets: Prisma.SentenceSetGetPayload<{ select: typeof select }>[] = []

    if (sort === 'popular') {
      const whereSql = rawWhere.length > 0
        ? Prisma.sql`WHERE ${Prisma.join(rawWhere, ' AND ')}`
        : Prisma.sql``
      const idRows = await prisma.$queryRaw<{ id: number }[]>`
        SELECT ss.id, COUNT(DISTINCT sr."userId") AS learners
        FROM "SentenceSet" ss
        LEFT JOIN "Sentence" s ON s."sentenceSetId" = ss.id
        LEFT JOIN "SentenceRecord" sr ON sr."sentenceId" = s.id
        ${whereSql}
        GROUP BY ss.id
        ORDER BY learners DESC, ss."createdAt" DESC
        LIMIT ${pageSize} OFFSET ${skip}`

      const orderedIds = idRows.map(row => row.id)
      if (orderedIds.length > 0) {
        const orderMap = new Map(orderedIds.map((id, index) => [id, index]))
        sentenceSets = (await prisma.sentenceSet.findMany({
          where: { id: { in: orderedIds } },
          select,
        })).sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0))
      }
    } else {
      const orderBy: Prisma.SentenceSetOrderByWithRelationInput = sort === 'name'
        ? { name: 'asc' }
        : { createdAt: 'desc' }
      sentenceSets = await prisma.sentenceSet.findMany({
        where,
        select,
        orderBy,
        skip,
        take: pageSize,
      })
    }

    const ids = sentenceSets.map(s => s.id)

    // 单条 SQL 查询当前页句子集的学习人数
    let learnersMap = new Map<number, number>()
    if (ids.length > 0) {
      const rows = await prisma.$queryRaw<{ sentenceSetId: number; learners: number | bigint }[]>`
        SELECT s."sentenceSetId" AS "sentenceSetId", COUNT(DISTINCT sr."userId") AS learners
        FROM "SentenceRecord" sr
        JOIN "Sentence" s ON s."id" = sr."sentenceId"
        WHERE s."sentenceSetId" IN (${Prisma.join(ids)})
        GROUP BY s."sentenceSetId"`

      learnersMap = new Map(rows.map(r => [r.sentenceSetId, Number(r.learners)]))
    }

    // ---- 2. 查询当前用户的完成进度（用户独立数据，不缓存） ----
    const doneMap = new Map<number, number>()

    if (userId && ids.length > 0) {
      // 单条 SQL 批量查询所有句子集的已完成数（替代原先 N+1 循环查询）
      const rows = await prisma.$queryRaw<{ sentenceSetId: number; done: number | bigint }[]>`
        SELECT s."sentenceSetId" AS "sentenceSetId", COUNT(DISTINCT sr."sentenceId") AS done
        FROM "SentenceRecord" sr
        JOIN "Sentence" s ON s."id" = sr."sentenceId"
        WHERE sr."userId" = ${userId}
          AND (sr."isCorrect" = true OR sr."isMastered" = true)
          AND sr."archived" = false
          AND s."sentenceSetId" IN (${Prisma.join(ids)})
        GROUP BY s."sentenceSetId"`

      for (const r of rows) {
        doneMap.set(r.sentenceSetId, Number(r.done))
      }
    }

    // ---- 2.5 查询用户每个句子集的最近学习时间 ----
    const lastStudiedMap = new Map<number, string>()
    if (userId && ids.length > 0) {
      const rows = await prisma.$queryRaw<{ sentenceSetId: number; lastStudied: Date }[]>`
        SELECT s."sentenceSetId" AS "sentenceSetId", MAX(sr."createdAt") AS "lastStudied"
        FROM "SentenceRecord" sr
        JOIN "Sentence" s ON s."id" = sr."sentenceId"
        WHERE sr."userId" = ${userId}
          AND s."sentenceSetId" IN (${Prisma.join(ids)})
        GROUP BY s."sentenceSetId"`
      for (const r of rows) {
        lastStudiedMap.set(r.sentenceSetId, r.lastStudied.toISOString())
      }
    }

    // ---- 3. 合并返回 ----
    const client = createOssClient()
    const data = sentenceSets.map(s => ({
      id: s.id,
      name: s.name,
      slug: s.slug,
      description: s.description,
      isPro: s.isPro,
      level: s.level,
      coverImage: getSignedOssUrl(client, s.coverImage) || s.coverImage,
      ossDir: s.ossDir,
      createdTime: s.createdAt.toISOString(),
      catalogFirst: s.catalogFirst,
      catalogSecond: s.catalogSecond,
      catalogThird: s.catalogThird,
      _count: {
        sentences: s._count.sentences,
        done: doneMap.get(s.id) ?? 0,
      },
      learnersCount: learnersMap.get(s.id) ?? 0,
      lastStudiedAt: lastStudiedMap.get(s.id) ?? null,
    }))

    return NextResponse.json({
      success: true,
      data,
      total,
      page,
      pageSize,
      hasMore: skip + data.length < total,
    })
  } catch (error) {
    console.error('获取句子集列表失败:', error)
    return NextResponse.json({ error: '获取列表失败' }, { status: 500 })
  }
}
