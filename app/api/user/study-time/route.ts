import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import {
  calculateActionStudyMinutes,
  calculateVideoStats,
} from '@/lib/studyTime'
import { PLAN_DAYS } from '@/lib/membership'

type Period = 'day' | 'week' | 'month' | 'year'

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
  } else if (period === 'month') {
    start.setDate(1)
    start.setHours(0, 0, 0, 0)
    end.setHours(23, 59, 59, 999)
  } else {
    // year - 当年从1月1日到12月31日
    start.setMonth(0, 1)
    start.setHours(0, 0, 0, 0)
    end.setMonth(11, 31)
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

    // 获取所有用户的学习记录
    const [wordRecords, sentenceRecords, shadowingRecords, videoRecords] = await Promise.all([
      prisma.wordRecord.findMany({
        where: { createdAt: { gte: start, lte: end } },
        select: { userId: true, createdAt: true },
      }),
      prisma.sentenceRecord.findMany({
        where: { createdAt: { gte: start, lte: end } },
        select: { userId: true, createdAt: true },
      }),
      prisma.$queryRaw<{ userId: string; createdAt: Date }[]>`
        SELECT "userId", "createdAt"
        FROM "ShadowingRecord"
        WHERE "createdAt" >= ${start} AND "createdAt" <= ${end}
      `,
      prisma.videoRecord.groupBy({
        by: ['userId', 'videoId'],
        where: { createdAt: { gte: start, lte: end } },
        _sum: { playedSeconds: true, activeSeconds: true },
      }),
    ])

    // 按用户分组动作型学习记录
    const userRecordsMap = new Map<string, Array<{ time: Date; type: 'word' | 'sentence' | 'shadowing' }>>()
    wordRecords.forEach(r => {
      if (!userRecordsMap.has(r.userId)) userRecordsMap.set(r.userId, [])
      userRecordsMap.get(r.userId)!.push({ time: r.createdAt, type: 'word' })
    })
    sentenceRecords.forEach(r => {
      if (!userRecordsMap.has(r.userId)) userRecordsMap.set(r.userId, [])
      userRecordsMap.get(r.userId)!.push({ time: r.createdAt, type: 'sentence' })
    })
    shadowingRecords.forEach(r => {
      if (!userRecordsMap.has(r.userId)) userRecordsMap.set(r.userId, [])
      userRecordsMap.get(r.userId)!.push({ time: r.createdAt, type: 'shadowing' })
    })

    // 按用户分组视频聚合
    const userVideoMap = new Map<string, Array<{ videoId: number; playedSeconds: number; activeSeconds: number }>>()
    videoRecords.forEach(v => {
      if (!userVideoMap.has(v.userId)) userVideoMap.set(v.userId, [])
      userVideoMap.get(v.userId)!.push({
        videoId: v.videoId,
        playedSeconds: v._sum.playedSeconds ?? 0,
        activeSeconds: v._sum.activeSeconds ?? 0,
      })
    })

    // 合并用户 ID 集合
    const allUserIds = new Set<string>([
      ...userRecordsMap.keys(),
      ...userVideoMap.keys(),
    ])

    // 计算每个用户的合并统计
    const userIdToStats = new Map<string, {
      minutes: number
      wordCount: number
      sentenceCount: number
      shadowingCount: number
      videoCount: number
      videoMinutes: number
    }>()

    allUserIds.forEach(userId => {
      const action = calculateActionStudyMinutes(userRecordsMap.get(userId) ?? [])
      const video = calculateVideoStats(userVideoMap.get(userId) ?? [])
      userIdToStats.set(userId, {
        minutes: action.minutes + video.videoMinutes,
        wordCount: action.wordCount,
        sentenceCount: action.sentenceCount,
        shadowingCount: action.shadowingCount,
        videoCount: video.videoCount,
        videoMinutes: video.videoMinutes,
      })
    })

    const userIds = Array.from(userIdToStats.keys())

    // 拉取用户信息
    const users = userIds.length
      ? await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, userName: true, avatar: true },
        })
      : []
    const userInfoMap = new Map(users.map(u => [u.id, u]))

    // 获取所有排行用户的已支付订单，用于判断当前生效的会员类型
    const paidOrders = userIds.length
      ? await prisma.order.findMany({
          where: { userId: { in: userIds }, status: 'paid' },
          orderBy: { createdAt: 'asc' },
          select: { userId: true, plan: true, createdAt: true },
        })
      : []

    const planDaysMap = PLAN_DAYS
    const userMemberPlan = new Map<string, string>()
    const ordersByUser = new Map<string, typeof paidOrders>()
    paidOrders.forEach(o => {
      if (!ordersByUser.has(o.userId)) ordersByUser.set(o.userId, [])
      ordersByUser.get(o.userId)!.push(o)
    })
    const nowMs = Date.now()
    ordersByUser.forEach((userOrders, uid) => {
      let cursor = 0
      for (const o of userOrders) {
        const days = planDaysMap[o.plan] ?? 30
        const oTime = new Date(o.createdAt).getTime()
        const s = cursor > oTime ? cursor : oTime
        const e = s + days * 86400000
        cursor = e
        if (nowMs >= s && nowMs < e) {
          userMemberPlan.set(uid, o.plan)
          break
        }
      }
    })

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
          shadowingCount: stats.shadowingCount,
          videoCount: stats.videoCount,
          videoMinutes: stats.videoMinutes,
          memberPlan: userMemberPlan.get(userId) || 'free',
        }
      })
      .filter(r => r.minutes > 0)
      .sort((a, b) => b.minutes - a.minutes)

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
