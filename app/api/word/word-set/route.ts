import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import OSS from 'ali-oss'

// 公开 API: 获取单词集列表(用于前端筛选)
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
      // 如果只选择了一级目录,返回该一级目录下的所有单词集
      // 不限制 catalogSecondId
    }

    if (catalogThirdId) {
      where.catalogThirdId = parseInt(catalogThirdId)
    }

    const wordSets = await prisma.wordSet.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        isPro: true,
        coverImage: true,
        catalogFirst: { select: { id: true, name: true } },
        catalogSecond: { select: { id: true, name: true } },
        catalogThird: { select: { id: true, name: true } },
        _count: { select: { words: true } }
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

    // 统计每个词集的去重学习人数
    const ids = wordSets.map(ws => ws.id)
    let learnersMap = new Map<number, number>()
    if (ids.length > 0) {
      const rows = await prisma.$queryRaw<{ wordSetId: number, learners: number | bigint }[]>`
        SELECT ws."id" AS "wordSetId", COUNT(DISTINCT wr."userId") AS learners
        FROM "WordRecord" wr
        JOIN "Word" w ON w."id" = wr."wordId"
        JOIN "WordSet" ws ON ws."id" = w."wordSetId"
        WHERE ws."id" IN (${Prisma.join(ids)})
        GROUP BY ws."id"`

      learnersMap = new Map(rows.map(r => [r.wordSetId, Number(r.learners)]))
    }

    const data = wordSets.map(ws => {
      let coverImage = ws.coverImage
      try {
        if (coverImage && !/^https?:\/\//i.test(coverImage)) {
          coverImage = client.signatureUrl(coverImage, { expires: parseInt(process.env.OSS_EXPIRES || '3600', 10) })
        }
      } catch {}
      return {
        ...ws,
        coverImage,
        learnersCount: learnersMap.get(ws.id) ?? 0,
      }
    })

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('获取单词集列表失败:', error)
    return NextResponse.json({ error: '获取列表失败' }, { status: 500 })
  }
}


