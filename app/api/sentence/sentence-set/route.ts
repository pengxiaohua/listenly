import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { createOssClient, getSignedOssUrl } from '@/lib/oss'

// ========== 内存缓存（公共数据：课程列表 + 学习人数） ==========
interface CachedSentenceSet {
  id: number
  name: string
  slug: string
  description: string | null
  isPro: boolean
  coverImage: string | null
  ossDir: string | null
  createdTime: string
  catalogFirst: { id: number; name: string } | null
  catalogSecond: { id: number; name: string } | null
  catalogThird: { id: number; name: string } | null
  _count: { sentences: number }
  learnersCount: number
}

interface CacheEntry {
  data: CachedSentenceSet[]
  timestamp: number
}

const CACHE_TTL = 60_000 // 60 秒缓存过期
const cache = new Map<string, CacheEntry>()

function getCacheKey(where: Record<string, unknown>): string {
  return JSON.stringify(where)
}

function getCached(key: string): CachedSentenceSet[] | null {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    cache.delete(key)
    return null
  }
  return entry.data
}

function setCache(key: string, data: CachedSentenceSet[]) {
  cache.set(key, { data, timestamp: Date.now() })
}

// ========== 公开 API: 获取句子集列表(用于前端筛选) ==========
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
      const sentenceSets = await prisma.sentenceSet.findMany({
        where,
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          isPro: true,
          coverImage: true,
          ossDir: true,
          createdAt: true,
          catalogFirst: { select: { id: true, name: true } },
          catalogSecond: { select: { id: true, name: true } },
          catalogThird: { select: { id: true, name: true } },
          _count: { select: { sentences: true } }
        },
        orderBy: { createdAt: 'desc' }
      })

      const ids = sentenceSets.map(s => s.id)

      // 单条 SQL 查询所有句子集的学习人数
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

      const client = createOssClient()

      cachedData = sentenceSets.map(s => {
        const coverImage = getSignedOssUrl(client, s.coverImage) || s.coverImage
        return {
          id: s.id,
          name: s.name,
          slug: s.slug,
          description: s.description,
          isPro: s.isPro,
          coverImage,
          ossDir: s.ossDir,
          createdTime: s.createdAt.toISOString(),
          catalogFirst: s.catalogFirst,
          catalogSecond: s.catalogSecond,
          catalogThird: s.catalogThird,
          _count: { sentences: s._count.sentences },
          learnersCount: learnersMap.get(s.id) ?? 0,
        }
      })

      setCache(cacheKey, cachedData)
    }

    // ---- 2. 查询当前用户的完成进度（用户独立数据，不缓存） ----
    const ids = cachedData.map(s => s.id)
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

    // ---- 3. 合并返回 ----
    const data = cachedData.map(s => ({
      ...s,
      _count: {
        ...s._count,
        done: doneMap.get(s.id) ?? 0,
      },
    }))

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('获取句子集列表失败:', error)
    return NextResponse.json({ error: '获取列表失败' }, { status: 500 })
  }
}
