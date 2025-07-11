import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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
        correct: true
      }
    })

    // 按日期聚合学习数据
    const studyData: Record<string, { count: number; minutes: number }> = {}

    // 处理单词记录
    wordRecords.forEach(record => {
      const date = record.createdAt.toISOString().split('T')[0]
      if (!studyData[date]) {
        studyData[date] = { count: 0, minutes: 0 }
      }
      studyData[date].count += 1
      // 假设每个单词练习消耗1分钟
      studyData[date].minutes += 1
    })

    // 处理句子记录
    sentenceRecords.forEach(record => {
      const date = record.createdAt.toISOString().split('T')[0]
      if (!studyData[date]) {
        studyData[date] = { count: 0, minutes: 0 }
      }
      studyData[date].count += 1
      // 假设每个句子练习消耗2分钟
      studyData[date].minutes += 2
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
