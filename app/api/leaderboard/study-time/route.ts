import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

type Period = 'day' | 'week' | 'month'

function getPeriodRange(period: Period) {
  const now = new Date()
  const end = new Date(now)
  const start = new Date(now)

  if (period === 'day') {
    start.setHours(0, 0, 0, 0)
    end.setHours(23, 59, 59, 999)
  } else if (period === 'week') {
    // 以周一为一周开始
    const day = now.getDay() || 7 // 周日为0，改为7
    const diffToMonday = day - 1
    start.setDate(now.getDate() - diffToMonday)
    start.setHours(0, 0, 0, 0)
    end.setHours(23, 59, 59, 999)
  } else {
    // month
    start.setDate(1)
    start.setHours(0, 0, 0, 0)
    end.setHours(23, 59, 59, 999)
  }

  return { start, end }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const period = (searchParams.get('period') || 'day') as Period
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100)
    const { start, end } = getPeriodRange(period)

    // 分别统计单词与句子记录数量
    const [wordGroups, sentenceGroups] = await Promise.all([
      prisma.wordRecord.groupBy({
        by: ['userId'],
        where: {
          createdAt: { gte: start, lte: end },
        },
        _count: { _all: true },
      }),
      prisma.sentenceRecord.groupBy({
        by: ['userId'],
        where: {
          createdAt: { gte: start, lte: end },
        },
        _count: { _all: true },
      }),
    ])

    // 合并为分钟数（约定：单词1分钟，句子2分钟）
    const userIdToStats = new Map<string, { minutes: number; wordCount: number; sentenceCount: number }>()

    for (const g of wordGroups) {
      const prev = userIdToStats.get(g.userId) || { minutes: 0, wordCount: 0, sentenceCount: 0 }
      prev.minutes += g._count._all * 1
      prev.wordCount += g._count._all
      userIdToStats.set(g.userId, prev)
    }

    for (const g of sentenceGroups) {
      const prev = userIdToStats.get(g.userId) || { minutes: 0, wordCount: 0, sentenceCount: 0 }
      prev.minutes += g._count._all * 2
      prev.sentenceCount += g._count._all
      userIdToStats.set(g.userId, prev)
    }

    const userIds = Array.from(userIdToStats.keys())

    // 拉取用户信息
    const users = userIds.length
      ? await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, userName: true, avatar: true },
        })
      : []

    const userInfoMap = new Map(users.map(u => [u.id, u]))

    const ranks = userIds
      .map(userId => {
        const stats = userIdToStats.get(userId)!
        const userInfo = userInfoMap.get(userId)
        return {
          userId,
          userName: userInfo?.userName || '未知用户',
          avatar: userInfo?.avatar || '',
          minutes: stats.minutes,
          wordCount: stats.wordCount,
          sentenceCount: stats.sentenceCount,
        }
      })
      .sort((a, b) => b.minutes - a.minutes)

    // 计算排名
    let currentUserRank: { userId: string; minutes: number; rank: number } | null = null
    const me = await auth()
    if (me) {
      const idx = ranks.findIndex(r => r.userId === me.id)
      if (idx !== -1) {
        currentUserRank = { userId: me.id, minutes: ranks[idx].minutes, rank: idx + 1 }
      }
    }

    return NextResponse.json({
      success: true,
      data: ranks.slice(0, limit).map((r, i) => ({ ...r, rank: i + 1 })),
      totalUsers: ranks.length,
      currentUser: currentUserRank,
      period,
    })
  } catch (error) {
    console.error('获取学习时长排行榜失败:', error)
    return NextResponse.json({ success: false, error: '获取学习时长排行榜失败' }, { status: 500 })
  }
}


