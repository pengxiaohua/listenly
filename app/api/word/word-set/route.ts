import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import OSS from 'ali-oss'

// 公开 API: 获取单词集列表(用于前端筛选)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const catalogFirstId = searchParams.get('catalogFirstId')
    const catalogSecondId = searchParams.get('catalogSecondId')
    const catalogThirdId = searchParams.get('catalogThirdId')
    // 由于 /api/word/word-set 是公开路由，middleware 不会添加 x-user-id 请求头
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
        createdAt: true,
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
      const wordRecords = await prisma.wordRecord.findMany({
        where: {
          word: {
            wordSetId: { in: ids }
          }
        },
        select: {
          userId: true,
          word: {
            select: {
              wordSetId: true
            }
          }
        }
      })

      // 按 wordSetId 分组，统计不重复的 userId
      const learnersBySet = new Map<number, Set<string>>()
      for (const record of wordRecords) {
        const wordSetId = record.word.wordSetId
        if (!learnersBySet.has(wordSetId)) {
          learnersBySet.set(wordSetId, new Set())
        }
        learnersBySet.get(wordSetId)!.add(record.userId)
      }

      learnersMap = new Map(
        Array.from(learnersBySet.entries()).map(([wordSetId, userIds]) => [wordSetId, userIds.size])
      )
    }

    // 统计每个词集中用户已完成的单词数（按 wordId 去重，避免重复计数）
    const doneMap = new Map<number, number>()
    if (userId && ids.length > 0) {
      for (const wordSetId of ids) {
        const doneRecords = await prisma.wordRecord.findMany({
          where: {
            userId,
            OR: [{ isCorrect: true }, { isMastered: true }],
            archived: false,
            word: { wordSetId },
          },
          select: { wordId: true },
          distinct: ['wordId'],
        })
        doneMap.set(wordSetId, doneRecords.length)
      }
    }

    const data = wordSets.map(ws => {
      let coverImage = ws.coverImage
      try {
        if (coverImage && !/^https?:\/\//i.test(coverImage)) {
          coverImage = client.signatureUrl(coverImage, { expires: parseInt(process.env.OSS_EXPIRES || '3600', 10) })
        }
      } catch {}
      const { createdAt, ...rest } = ws
      return {
        ...rest,
        coverImage,
        createdTime: createdAt.toISOString(),
        learnersCount: learnersMap.get(ws.id) ?? 0,
        _count: {
          ...ws._count,
          done: doneMap.get(ws.id) ?? 0,
        },
      }
    })

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('获取单词集列表失败:', error)
    return NextResponse.json({ error: '获取列表失败' }, { status: 500 })
  }
}


