import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getLocalDateString } from '@/lib/timeUtils'

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id')
  if (!userId) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }

  try {
    // 获取最近7天的日期范围
    const now = new Date()
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(now.getDate() - 6)
    sevenDaysAgo.setHours(0, 0, 0, 0)

    const endDate = new Date(now)
    endDate.setHours(23, 59, 59, 999)

    // 并行获取所有学习记录
    const [wordRecords, sentenceRecords, shadowingRecords] = await Promise.all([
      prisma.wordRecord.findMany({
        where: {
          userId,
          createdAt: { gte: sevenDaysAgo, lte: endDate }
        },
        select: { createdAt: true }
      }),
      prisma.sentenceRecord.findMany({
        where: {
          userId,
          createdAt: { gte: sevenDaysAgo, lte: endDate }
        },
        select: { createdAt: true }
      }),
      prisma.$queryRaw<{ createdAt: Date }[]>`
        SELECT "createdAt"
        FROM "ShadowingRecord"
        WHERE "userId" = ${userId}
          AND "createdAt" >= ${sevenDaysAgo}
          AND "createdAt" <= ${endDate}
      `
    ])

    // 按小时统计：记录每个小时在哪些天有学习活动
    const hourlyDays: Map<number, Set<string>> = new Map()

    const processRecord = (createdAt: Date) => {
      const hour = createdAt.getHours()
      const dateStr = getLocalDateString(createdAt)

      if (!hourlyDays.has(hour)) {
        hourlyDays.set(hour, new Set())
      }
      hourlyDays.get(hour)!.add(dateStr)
    }

    wordRecords.forEach(r => processRecord(r.createdAt))
    sentenceRecords.forEach(r => processRecord(r.createdAt))
    shadowingRecords.forEach(r => processRecord(r.createdAt))

    // 转换为响应格式
    const hourlyActivity = Array.from(hourlyDays.entries()).map(([hour, days]) => ({
      hour,
      days: days.size
    })).sort((a, b) => a.hour - b.hour)

    // 计算日期范围字符串
    const startDateStr = getLocalDateString(sevenDaysAgo)
    const endDateStr = getLocalDateString(now)

    return NextResponse.json({
      success: true,
      data: {
        startDate: startDateStr,
        endDate: endDateStr,
        hourlyActivity
      }
    })
  } catch (error) {
    console.error('获取学习活动期数据失败:', error)
    return NextResponse.json({ error: '获取学习活动期数据失败' }, { status: 500 })
  }
}
