import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { createOssClient, getSignedOssUrl } from '@/lib/oss'

// ========== 内存缓存（公共数据：课程列表 + 学习人数） ==========
interface CachedWordSet {
  id: number
  name: string
  slug: string
  description: string | null
  isPro: boolean
  coverImage: string | null
  createdTime: string
  catalogFirst: { id: number; name: string } | null
  catalogSecond: { id: number; name: string } | null
  catalogThird: { id: number; name: string } | null
  _count: { words: number }
  learnersCount: number
}

interface CacheEntry {
  data: CachedWordSet[]
  timestamp: number
}

const CACHE_TTL = 60_000 // 60 秒缓存过期
const cache = new Map<string, CacheEntry>()

function getCacheKey(where: Record<string, unknown>): string {
  return JSON.stringify(where)
}

function getCached(key: string): CachedWordSet[] | null {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    cache.delete(key)
    return null
  }
  return entry.data
}

function setCache(key: string, data: CachedWordSet[]) {
  cache.set(key, { data, timestamp: Date.now() })
}

// ========== 公开 API: 获取单词集列表(用于前端筛选) ==========
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const catalogFirstId = searchParams.get('catalogFirstId')
    const catalogSecondId = searchParams.get('catalogSecondId')
    const catalogThirdId = searchParams.get('catalogThirdId')
    const userId = req.headers.get('x-user-id') || req.cookies.get('userId')?.value || undefined

    const where: {
      catalogFirstId?: number
      catalogSecondId?: number | null
      catalogThirdId?: number | null
    } = {}

    if (catalogFirstId) {
      where.catalogFirstId = parseInt(catalogFirstId)
    }

    if (catalogSecondId) {
      where.catalogSecondId = parseInt(catalogSecondId)
    }

    if (catalogThirdId) {
      where.catalogThirdId = parseInt(catalogThirdId)
    }

    // ---- 1. 从缓存获取公共数据（课程列表 + 学习人数） ----
    const cacheKey = getCacheKey(where)
    let cachedData = getCached(cacheKey)

    if (!cachedData) {
      // 缓存未命中，查询数据库
      const wordSets = await prisma.wordSet.findMany({
        where,
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          isPro: true,
          coverImage: true,
          createdAt: true,
          catalogFirst: { select: { id: true, name: true } },
          catalogSecond: { select: { id: true, name: true } },
          catalogThird: { select: { id: true, name: true } },
          _count: { select: { words: true } }
        },
        orderBy: { createdAt: 'desc' }
      })

      const ids = wordSets.map(ws => ws.id)

      // 用单条 SQL 查询所有词集的学习人数（替代原先加载全部 WordRecord 到内存的方式）
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

      const client = createOssClient()

      cachedData = wordSets.map(ws => {
        const coverImage = getSignedOssUrl(client, ws.coverImage) || ws.coverImage
        return {
          id: ws.id,
          name: ws.name,
          slug: ws.slug,
          description: ws.description,
          isPro: ws.isPro,
          coverImage,
          createdTime: ws.createdAt.toISOString(),
          catalogFirst: ws.catalogFirst,
          catalogSecond: ws.catalogSecond,
          catalogThird: ws.catalogThird,
          _count: { words: ws._count.words },
          learnersCount: learnersMap.get(ws.id) ?? 0,
        }
      })

      setCache(cacheKey, cachedData)
    }

    // ---- 2. 查询当前用户的完成进度（用户独立数据，不缓存） ----
    const ids = cachedData.map(ws => ws.id)
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

    // ---- 3. 合并返回 ----
    const data = cachedData.map(ws => ({
      ...ws,
      _count: {
        ...ws._count,
        done: doneMap.get(ws.id) ?? 0,
      },
    }))

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('获取单词集列表失败:', error)
    return NextResponse.json({ error: '获取列表失败' }, { status: 500 })
  }
}
