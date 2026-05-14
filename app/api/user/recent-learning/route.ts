import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

// 获取用户最近学习分类记录
export async function GET() {
  const user = await auth()
  if (!user) {
    return NextResponse.json({ error: '用户未登录' }, { status: 401 })
  }

  try {
    // 获取最近的学习记录，按分类统计
    const [recentWordRecords, recentSentenceRecords, recentShadowingRecords, recentVideoRecords] = await Promise.all([
      // 最近单词学习记录，按分类分组
      prisma.wordRecord.findMany({
        where: {
          userId: user.id
        },
        include: {
          word: {
            include: {
              wordSet: true
            }
          }
        },
        orderBy: {
          lastAttempt: 'desc'
        }
      }),
      // 最近句子学习记录，按语料库分组
      prisma.sentenceRecord.findMany({
        where: {
          userId: user.id
        },
        include: {
          sentence: {
            include: {
              sentenceSet: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      }),
      // 最近影子跟读记录，按跟读集分组
      prisma.$queryRaw<{
        id: number;
        createdAt: Date;
        shadowingId: number;
        setId: number;
        setName: string;
        setDescription: string | null;
        setSlug: string;
        score: number | null;
      }[]>`
        SELECT sr.id,
               sr."createdAt",
               s.id AS "shadowingId",
               ss.id AS "setId",
               ss.name AS "setName",
               ss.description AS "setDescription",
               ss.slug AS "setSlug",
               sr.score AS score
        FROM "ShadowingRecord" sr
        JOIN "Shadowing" s ON s.id = sr."shadowingId"
        JOIN "ShadowingSet" ss ON ss.id = s."shadowingSetId"
        WHERE sr."userId" = ${user.id}
        ORDER BY sr."createdAt" DESC
      `,
      // 最近视听演练记录（按视频分类聚合）
      prisma.videoRecord.findMany({
        where: { userId: user.id },
        orderBy: { updatedAt: 'desc' },
        select: {
          videoId: true,
          updatedAt: true,
          playedSeconds: true,
          activeSeconds: true,
        },
      }),
    ])

    // 按分类统计单词学习记录
    const wordCategories = new Map<string, {
      type: 'word'
      category: string
      categoryName: string
      lastAttempt: Date
      totalCount: number
      correctCount: number
    }>()

    recentWordRecords.forEach(record => {
      const category = record.word.wordSet.slug
      const categoryName = record.word.wordSet.name
      const key = `word-${category}`

      if (!wordCategories.has(key)) {
        wordCategories.set(key, {
          type: 'word',
          category,
          categoryName,
          lastAttempt: record.lastAttempt,
          totalCount: 0,
          correctCount: 0
        })
      }

      const categoryData = wordCategories.get(key)!
      categoryData.totalCount++
      if (record.errorCount === 0) {
        categoryData.correctCount++
      }
      // 更新最新学习时间
      if (record.lastAttempt > categoryData.lastAttempt) {
        categoryData.lastAttempt = record.lastAttempt
      }
    })

    // 按分类统计句子学习记录
    const sentenceCategories = new Map<string, {
      id: number
      type: 'sentence'
      category: string
      categoryName: string
      lastAttempt: Date
      totalCount: number
      correctCount: number
      slug: string
    }>()

    recentSentenceRecords.forEach(record => {
      const category = record.sentence.sentenceSet.name
      const categoryName = record.sentence.sentenceSet.description || record.sentence.sentenceSet.name
      const key = `sentence-${category}`

      if (!sentenceCategories.has(key)) {
        sentenceCategories.set(key, {
          id: record.sentence.sentenceSet.id,
          type: 'sentence',
          category,
          categoryName,
          lastAttempt: record.createdAt,
          totalCount: 0,
          correctCount: 0,
          slug: record.sentence.sentenceSet.slug
        })
      }

      const categoryData = sentenceCategories.get(key)!
      categoryData.totalCount++
      if (record.errorCount === 0) {
        categoryData.correctCount++
      }
      // 更新最新学习时间
      if (record.createdAt > categoryData.lastAttempt) {
        categoryData.lastAttempt = record.createdAt
      }
    })

    // 按分类统计影子跟读记录
    const shadowingCategories = new Map<string, {
      id: number
      type: 'shadowing'
      category: string
      categoryName: string
      lastAttempt: Date
      totalCount: number
      avgScore: number
      slug: string
      // 内部累计字段（不返回给前端）
      _scoreSum?: number
      _scoredCount?: number
    }>()

    recentShadowingRecords.forEach((record) => {
      const category = record.setName
      const categoryName = record.setDescription || record.setName
      const key = `shadowing-${category}`

      if (!shadowingCategories.has(key)) {
        shadowingCategories.set(key, {
          id: record.setId,
          type: 'shadowing',
          category,
          categoryName,
          lastAttempt: record.createdAt,
          totalCount: 0,
          avgScore: 0,
          slug: record.setSlug,
          _scoreSum: 0,
          _scoredCount: 0,
        })
      }

      const categoryData = shadowingCategories.get(key)!
      categoryData.totalCount++
      // 累计分数用于计算平均分（仅统计有分数的记录）
      if (typeof record.score === 'number') {
        categoryData._scoreSum = (categoryData._scoreSum || 0) + record.score
        categoryData._scoredCount = (categoryData._scoredCount || 0) + 1
        const count = categoryData._scoredCount || 0
        categoryData.avgScore = count > 0 ? Math.round((categoryData._scoreSum || 0) / count) : 0
      }
      if (record.createdAt > categoryData.lastAttempt) {
        categoryData.lastAttempt = record.createdAt
      }
    })

    // 合并所有分类并按时间排序
    const allCategories = [
      ...Array.from(wordCategories.values()),
      ...Array.from(sentenceCategories.values()),
      ...Array.from(shadowingCategories.values())
    ]

    // 视听演练：按视频聚合（每个视频一行）
    // - category：视频英文标题（用于唯一标识）
    // - categoryName：视频中文标题，缺失则回退英文标题
    // - totalCount：该视频累计的 VideoRecord 行数（"学习次数"）
    // - lastAttempt：该视频最近一次更新时间
    // 仅纳入累计有效观看 ≥ 30s 的视频，与排行榜"视频学习数"门槛一致
    type VideoCategoryStat = {
      type: 'video'
      category: string          // 视频英文标题
      categoryName: string      // 视频中文标题（缺失时回退英文）
      lastAttempt: Date
      totalCount: number        // 该视频的学习会话数
      videoUuid: string         // 跳转目标 uuid
    }
    if (recentVideoRecords.length > 0) {
      // 单视频累计聚合
      const perVideo = new Map<number, {
        played: number
        active: number
        sessions: number
        lastAt: Date
      }>()
      for (const r of recentVideoRecords) {
        const cur = perVideo.get(r.videoId)
        if (!cur) {
          perVideo.set(r.videoId, {
            played: r.playedSeconds,
            active: r.activeSeconds,
            sessions: 1,
            lastAt: r.updatedAt,
          })
        } else {
          cur.played += r.playedSeconds
          cur.active += r.activeSeconds
          cur.sessions += 1
          if (r.updatedAt > cur.lastAt) cur.lastAt = r.updatedAt
        }
      }

      const videoIds = Array.from(perVideo.keys())
      const videos = await prisma.video.findMany({
        where: { id: { in: videoIds } },
        select: { id: true, uuid: true, title: true, titleZh: true },
      })
      const videoMetaMap = new Map(videos.map(v => [v.id, v]))

      perVideo.forEach((agg, videoId) => {
        const meta = videoMetaMap.get(videoId)
        if (!meta) return
        const effectiveSeconds = agg.played + agg.active * 0.5
        if (effectiveSeconds < 30) return // 未达"有效观看"门槛

        allCategories.push({
          type: 'video',
          category: meta.title,
          categoryName: meta.titleZh || meta.title,
          lastAttempt: agg.lastAt,
          totalCount: agg.sessions,
          videoUuid: meta.uuid,
        } as VideoCategoryStat as never)
      })
    }

    // 按时间排序，取最近4个分类
    const recentLearning = allCategories
      .sort((a, b) => b.lastAttempt.getTime() - a.lastAttempt.getTime())
      .slice(0, 4)

    return NextResponse.json({
      success: true,
      data: recentLearning
    })
  } catch (error) {
    console.error('获取最近学习分类失败:', error)
    return NextResponse.json({ error: '获取最近学习分类失败' }, { status: 500 })
  }
}

