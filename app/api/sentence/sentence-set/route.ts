import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import OSS from 'ali-oss'

// 公开 API: 获取句子集列表(用于前端筛选)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const catalogFirstId = searchParams.get('catalogFirstId')
    const catalogSecondId = searchParams.get('catalogSecondId')
    const catalogThirdId = searchParams.get('catalogThirdId')
    // 由于 /api/sentence/sentence-set 是公开路由，middleware 不会添加 x-user-id 请求头
    // 需要直接从 cookie 中获取 userId
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

    const client = new OSS({
      region: process.env.OSS_REGION!,
      accessKeyId: process.env.OSS_ACCESS_KEY_ID!,
      accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET!,
      bucket: process.env.OSS_BUCKET_NAME!,
      secure: true,
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

    // 统计每个句子集中用户已完成的句子数
    const doneMap = new Map<number, number>()
    if (userId && ids.length > 0) {
      // 参考 /api/word/word-set 的逻辑，对每个 sentenceSet 单独统计
      for (const sentenceSetId of ids) {
        const done = await prisma.sentenceRecord.count({
          where: {
            userId,
            OR: [{ isCorrect: true }, { isMastered: true }],
            archived: false,
            sentence: { sentenceSetId },
          },
        })
        doneMap.set(sentenceSetId, done)
      }
    }

    const data = sentenceSets.map(s => {
      let coverImage = s.coverImage
      try {
        if (coverImage && !/^https?:\/\//i.test(coverImage)) {
          coverImage = client.signatureUrl(coverImage, { expires: parseInt(process.env.OSS_EXPIRES || '3600', 10) })
        }
      } catch {}
      return {
        ...s,
        coverImage,
        learnersCount: learnersMap.get(s.id) ?? 0,
        _count: {
          ...s._count,
          done: doneMap.get(s.id) ?? 0,
        },
      }
    })

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('获取句子集列表失败:', error)
    return NextResponse.json({ error: '获取列表失败' }, { status: 500 })
  }
}


