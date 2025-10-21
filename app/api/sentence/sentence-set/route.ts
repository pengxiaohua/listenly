import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

// 公开 API: 获取句子集列表(用于前端筛选)
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

    if (catalogFirstId) {
      where.catalogFirstId = parseInt(catalogFirstId)
    }

    if (catalogSecondId) {
      where.catalogSecondId = parseInt(catalogSecondId)
    } else if (catalogFirstId) {
      // 只选了一级目录时不过滤二级
    }

    if (catalogThirdId) {
      where.catalogThirdId = parseInt(catalogThirdId)
    }

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
        catalogFirst: { select: { id: true, name: true } },
        catalogSecond: { select: { id: true, name: true } },
        catalogThird: { select: { id: true, name: true } },
        _count: { select: { sentences: true } }
      },
      orderBy: { createdAt: 'desc' }
    })

    // 统计每个句子集的去重学习人数（在该句子集下做过任一题目的用户数）
    const ids = sentenceSets.map(s => s.id)
    let learnersMap = new Map<number, number>()
    if (ids.length > 0) {
      const rows = await prisma.$queryRaw<{ sentenceSetId: number, learners: number | bigint }[]>`
        SELECT ss."id" AS "sentenceSetId", COUNT(DISTINCT sr."userId") AS learners
        FROM "SentenceRecord" sr
        JOIN "Sentence" s ON s."id" = sr."sentenceId"
        JOIN "SentenceSet" ss ON ss."id" = s."sentenceSetId"
        WHERE ss."id" IN (${Prisma.join(ids)})
        GROUP BY ss."id"`

      learnersMap = new Map(rows.map(r => [r.sentenceSetId, Number(r.learners)]))
    }

    const data = sentenceSets.map(s => ({
      ...s,
      learnersCount: learnersMap.get(s.id) ?? 0,
    }))

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('获取句子集列表失败:', error)
    return NextResponse.json({ error: '获取列表失败' }, { status: 500 })
  }
}


