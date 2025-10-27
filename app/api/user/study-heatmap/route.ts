import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getLocalDateString } from '@/lib/timeUtils'

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id')
  if (!userId) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }

  try {
    // 获取最近半年的日期范围
    const now = new Date()
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(now.getMonth() - 6)

    // 获取单词练习记录
    const wordRecords = await prisma.wordRecord.findMany({
      where: {
        userId,
        createdAt: {
          gte: sixMonthsAgo,
          lte: now
        }
      },
      select: {
        createdAt: true,
        isCorrect: true
      }
    })

    // 获取句子练习记录
    const sentenceRecords = await prisma.sentenceRecord.findMany({
      where: {
        userId,
        createdAt: {
          gte: sixMonthsAgo,
          lte: now
        }
      },
      select: {
        createdAt: true,
        isCorrect: true
      }
    })

    // 获取影子跟读记录
    const shadowingRecords = await (prisma as any).shadowingRecord.findMany({
      where: {
        userId,
        createdAt: {
          gte: sixMonthsAgo,
          lte: now
        }
      },
      select: {
        createdAt: true
      }
    })

    // 按日期聚合学习数据
    const studyData: Record<string, { count: number; minutes: number; records: Array<{ time: Date; type: 'word' | 'sentence' | 'shadowing' }> }> = {}
    // 处理单词记录
    wordRecords.forEach(record => {
      const date = getLocalDateString(record.createdAt)
      if (!studyData[date]) {
        studyData[date] = { count: 0, minutes: 0, records: [] }
      }
      studyData[date].count += 1
      studyData[date].records.push({ time: record.createdAt, type: 'word' })
    })

    // 处理句子记录
    sentenceRecords.forEach(record => {
      const date = getLocalDateString(record.createdAt)
      if (!studyData[date]) {
        studyData[date] = { count: 0, minutes: 0, records: [] }
      }
      studyData[date].count += 1
      studyData[date].records.push({ time: record.createdAt, type: 'sentence' })
    })

    // 处理影子跟读记录
    ;(shadowingRecords as Array<{ createdAt: Date }>).forEach(record => {
      const date = getLocalDateString(record.createdAt)
      if (!studyData[date]) {
        studyData[date] = { count: 0, minutes: 0, records: [] }
      }
      studyData[date].count += 1
      studyData[date].records.push({ time: record.createdAt, type: 'shadowing' })
    })

    // 计算每日实际学习时长（基于学习会话）
    Object.keys(studyData).forEach(date => {
      const dayData = studyData[date]
      if (dayData.records.length > 0) {
        // 按时间排序
        dayData.records.sort((a, b) => a.time.getTime() - b.time.getTime())

        // 将学习记录分组为学习会话（间隔超过5分钟视为不同会话）
        const sessions: Array<{ records: Array<{ time: Date; type: 'word' | 'sentence' | 'shadowing' }> }> = []
        let currentSession: Array<{ time: Date; type: 'word' | 'sentence' | 'shadowing' }> = []

        for (let i = 0; i < dayData.records.length; i++) {
          const record = dayData.records[i]

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
        sessions.forEach(session => {
          if (session.records.length === 1) {
            // 单次学习，根据类型设置基础时长
            const record = session.records[0]
            const baseMinutes = record.type === 'word' ? 1 : (record.type === 'sentence' ? 2 : 3)
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
        })

        dayData.minutes = Math.round(totalMinutes)

        // 清理records数组，节省内存
        dayData.records = []
      }
    })

    // 转换为热力图所需的数据格式
    const heatmapData = Object.entries(studyData).map(([date, data]) => ({
      date,
      count: data.count,
      minutes: data.minutes
    }))

    return NextResponse.json({
      success: true,
      data: heatmapData
    })
  } catch (error) {
    console.error('获取学习热力图数据失败:', error)
    return NextResponse.json({ error: '获取学习热力图数据失败' }, { status: 500 })
  }
}
