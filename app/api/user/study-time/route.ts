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

    // 获取所有用户的学习记录
    const [wordRecords, sentenceRecords] = await Promise.all([
      prisma.wordRecord.findMany({
        where: {
          createdAt: { gte: start, lte: end },
        },
        select: {
          userId: true,
          createdAt: true,
        },
      }),
      prisma.sentenceRecord.findMany({
        where: {
          createdAt: { gte: start, lte: end },
        },
        select: {
          userId: true,
          createdAt: true,
        },
      }),
    ])

    // 按用户分组学习记录
    const userRecordsMap = new Map<string, Array<{ time: Date; type: 'word' | 'sentence' }>>()

    // 处理单词记录
    wordRecords.forEach(record => {
      if (!userRecordsMap.has(record.userId)) {
        userRecordsMap.set(record.userId, [])
      }
      userRecordsMap.get(record.userId)!.push({ time: record.createdAt, type: 'word' })
    })

    // 处理句子记录
    sentenceRecords.forEach(record => {
      if (!userRecordsMap.has(record.userId)) {
        userRecordsMap.set(record.userId, [])
      }
      userRecordsMap.get(record.userId)!.push({ time: record.createdAt, type: 'sentence' })
    })

    // 计算每个用户的学习时长
    const userIdToStats = new Map<string, { minutes: number; wordCount: number; sentenceCount: number }>()

    userRecordsMap.forEach((records, userId) => {
      // 按时间排序
      records.sort((a, b) => a.time.getTime() - b.time.getTime())

      // 将学习记录分组为学习会话（间隔超过5分钟视为不同会话）
      const sessions: Array<{ records: Array<{ time: Date; type: 'word' | 'sentence' }> }> = []
      let currentSession: Array<{ time: Date; type: 'word' | 'sentence' }> = []

      for (let i = 0; i < records.length; i++) {
        const record = records[i]

        if (currentSession.length === 0) {
          // 第一个记录
          currentSession.push(record)
        } else {
          const lastRecord = currentSession[currentSession.length - 1]
          const timeDiff = record.time.getTime() - lastRecord.time.getTime()
          const minutesDiff = timeDiff / (1000 * 60)

          if (minutesDiff <= 5) {
            // 5分钟内，归为同一会话
            currentSession.push(record)
          } else {
            // 超过5分钟，开始新会话
            sessions.push({ records: [...currentSession] })
            currentSession = [record]
          }
        }
      }

      // 添加最后一个会话
      if (currentSession.length > 0) {
        sessions.push({ records: currentSession })
      }

      // 计算总学习时长（基于实际时间跨度）
      let totalMinutes = 0
      let wordCount = 0
      let sentenceCount = 0

      sessions.forEach(session => {
        if (session.records.length === 1) {
          // 单次学习，根据类型设置基础时长
          const record = session.records[0]
          const baseMinutes = record.type === 'word' ? 1 : 2
          totalMinutes += baseMinutes
        } else {
          // 多次学习，计算实际时间跨度
          const startTime = session.records[0].time
          const endTime = session.records[session.records.length - 1].time
          const timeSpanMs = endTime.getTime() - startTime.getTime()
          const timeSpanMinutes = Math.round(timeSpanMs / (1000 * 60))

          // 使用实际时间跨度，但设置合理的最小和最大值
          const actualMinutes = Math.max(timeSpanMinutes, 1) // 至少1分钟
          totalMinutes += actualMinutes
        }

        // 统计记录数量
        session.records.forEach(record => {
          if (record.type === 'word') {
            wordCount++
          } else {
            sentenceCount++
          }
        })
      })

      userIdToStats.set(userId, {
        minutes: Math.round(totalMinutes),
        wordCount,
        sentenceCount,
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


