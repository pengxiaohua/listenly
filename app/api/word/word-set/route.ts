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

// ========== 公开 API: 获取单词集列表(用于前端筛选) ==========
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
    const userId = req.headers.get('x-user-id') || req.cookies.get('userId')?.value || undefined

    const where: Prisma.WordSetWhereInput = {}
    const rawWhere: Prisma.Sql[] = []

    if (catalogFirstId) {
      where.catalogFirstId = parseInt(catalogFirstId)
      rawWhere.push(Prisma.sql`ws."catalogFirstId" = ${parseInt(catalogFirstId)}`)
    }

    if (catalogSecondId) {
      where.catalogSecondId = parseInt(catalogSecondId)
      rawWhere.push(Prisma.sql`ws."catalogSecondId" = ${parseInt(catalogSecondId)}`)
    }

    if (catalogThirdId) {
      where.catalogThirdId = parseInt(catalogThirdId)
      rawWhere.push(Prisma.sql`ws."catalogThirdId" = ${parseInt(catalogThirdId)}`)
    }

    if (slug) {
      where.slug = slug
      rawWhere.push(Prisma.sql`ws."slug" = ${slug}`)
    }

    if (levels.length > 0) {
      where.level = { in: levels }
      rawWhere.push(Prisma.sql`ws."level" IN (${Prisma.join(levels)})`)
    }

    const wantsPro = proFilters.includes('pro')
    const wantsFree = proFilters.includes('free')
    if (wantsPro !== wantsFree) {
      where.isPro = wantsPro
      rawWhere.push(Prisma.sql`ws."isPro" = ${wantsPro}`)
    }

    const total = await prisma.wordSet.count({ where })

    const select = {
      id: true,
      name: true,
      slug: true,
      description: true,
      isPro: true,
      level: true,
      coverImage: true,
      createdAt: true,
      catalogFirst: { select: { id: true, name: true } },
      catalogSecond: { select: { id: true, name: true } },
      catalogThird: { select: { id: true, name: true } },
      _count: { select: { words: true } }
    } satisfies Prisma.WordSetSelect

    let wordSets: Prisma.WordSetGetPayload<{ select: typeof select }>[] = []

    if (sort === 'popular') {
      const whereSql = rawWhere.length > 0
        ? Prisma.sql`WHERE ${Prisma.join(rawWhere, ' AND ')}`
        : Prisma.sql``
      const idRows = await prisma.$queryRaw<{ id: number }[]>`
        SELECT ws.id, COUNT(DISTINCT wr."userId") AS learners
        FROM "WordSet" ws
        LEFT JOIN "Word" w ON w."wordSetId" = ws.id
        LEFT JOIN "WordRecord" wr ON wr."wordId" = w.id
        ${whereSql}
        GROUP BY ws.id
        ORDER BY learners DESC, ws."createdAt" DESC
        LIMIT ${pageSize} OFFSET ${skip}`

      const orderedIds = idRows.map(row => row.id)
      if (orderedIds.length > 0) {
        const orderMap = new Map(orderedIds.map((id, index) => [id, index]))
        wordSets = (await prisma.wordSet.findMany({
          where: { id: { in: orderedIds } },
          select,
        })).sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0))
      }
    } else {
      const orderBy: Prisma.WordSetOrderByWithRelationInput = sort === 'name'
        ? { name: 'asc' }
        : { createdAt: 'desc' }
      wordSets = await prisma.wordSet.findMany({
        where,
        select,
        orderBy,
        skip,
        take: pageSize,
      })
    }

    const pageDataLength = wordSets.length

    if (userId && page === 1 && !slug) {
      const lastStudiedRecord = await prisma.wordRecord.findFirst({
        where: {
          userId,
          word: { wordSet: where },
        },
        orderBy: { lastAttempt: 'desc' },
        select: {
          word: {
            select: {
              wordSet: { select },
            },
          },
        },
      })

      const lastStudiedWordSet = lastStudiedRecord?.word.wordSet
      if (lastStudiedWordSet && !wordSets.some(ws => ws.id === lastStudiedWordSet.id)) {
        wordSets = [lastStudiedWordSet, ...wordSets]
      }
    }

    const ids = wordSets.map(ws => ws.id)

    // 用单条 SQL 查询当前页词集的学习人数
    let learnersMap = new Map<number, number>()
    if (ids.length > 0) {
      const rows = await prisma.$queryRaw<{ wordSetId: number; learners: number | bigint }[]>`
        SELECT w."wordSetId" AS "wordSetId", COUNT(DISTINCT wr."userId") AS learners
        FROM "WordRecord" wr
        JOIN "Word" w ON w."id" = wr."wordId"
        WHERE w."wordSetId" IN (${Prisma.join(ids)})
        GROUP BY w."wordSetId"`

      learnersMap = new Map(rows.map(r => [r.wordSetId, Number(r.learners)]))
    }

    // ---- 2. 查询当前用户的完成进度（用户独立数据，不缓存） ----
    const doneMap = new Map<number, number>()

    if (userId && ids.length > 0) {
      // 单条 SQL 批量查询所有词集的已完成数（替代原先 N+1 循环查询）
      const rows = await prisma.$queryRaw<{ wordSetId: number; done: number | bigint }[]>`
        SELECT w."wordSetId" AS "wordSetId", COUNT(DISTINCT wr."wordId") AS done
        FROM "WordRecord" wr
        JOIN "Word" w ON w."id" = wr."wordId"
        WHERE wr."userId" = ${userId}
          AND (wr."isCorrect" = true OR wr."isMastered" = true)
          AND wr."archived" = false
          AND w."wordSetId" IN (${Prisma.join(ids)})
        GROUP BY w."wordSetId"`

      for (const r of rows) {
        doneMap.set(r.wordSetId, Number(r.done))
      }
    }

    // ---- 2.5 查询用户每个词集的最近学习时间 ----
    const lastStudiedMap = new Map<number, string>()
    if (userId && ids.length > 0) {
      const rows = await prisma.$queryRaw<{ wordSetId: number; lastStudied: Date }[]>`
        SELECT w."wordSetId" AS "wordSetId", MAX(wr."lastAttempt") AS "lastStudied"
        FROM "WordRecord" wr
        JOIN "Word" w ON w."id" = wr."wordId"
        WHERE wr."userId" = ${userId}
          AND w."wordSetId" IN (${Prisma.join(ids)})
        GROUP BY w."wordSetId"`
      for (const r of rows) {
        lastStudiedMap.set(r.wordSetId, r.lastStudied.toISOString())
      }
    }

    // ---- 3. 合并返回 ----
    const client = createOssClient()
    const data = wordSets.map(ws => ({
      id: ws.id,
      name: ws.name,
      slug: ws.slug,
      description: ws.description,
      isPro: ws.isPro,
      level: ws.level,
      coverImage: getSignedOssUrl(client, ws.coverImage) || ws.coverImage,
      createdTime: ws.createdAt.toISOString(),
      catalogFirst: ws.catalogFirst,
      catalogSecond: ws.catalogSecond,
      catalogThird: ws.catalogThird,
      _count: {
        words: ws._count.words,
        done: doneMap.get(ws.id) ?? 0,
      },
      learnersCount: learnersMap.get(ws.id) ?? 0,
      lastStudiedAt: lastStudiedMap.get(ws.id) ?? null,
    }))

    return NextResponse.json({
      success: true,
      data,
      total,
      page,
      pageSize,
      hasMore: skip + pageDataLength < total,
    })
  } catch (error) {
    console.error('获取单词集列表失败:', error)
    return NextResponse.json({ error: '获取列表失败' }, { status: 500 })
  }
}
