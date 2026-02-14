import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getLocalDateString } from '@/lib/timeUtils'
import { getTodayStudyMinutes } from '@/lib/studyTime'

// 计算连续打卡天数
async function getStreakDays(userId: string): Promise<number> {
  const checkIns = await prisma.checkIn.findMany({
    where: { userId },
    orderBy: { date: 'desc' },
    select: { date: true }
  })

  if (checkIns.length === 0) return 0

  const today = getLocalDateString(new Date())
  const yesterday = getLocalDateString(new Date(Date.now() - 24 * 60 * 60 * 1000))

  let streak = 0
  let expectedDate = today

  // 如果今天没打卡，从昨天开始计算
  if (checkIns[0].date !== today) {
    if (checkIns[0].date !== yesterday) {
      return 0 // 昨天也没打卡，连续天数为0
    }
    expectedDate = yesterday
  }

  for (const checkIn of checkIns) {
    if (checkIn.date === expectedDate) {
      streak++
      // 计算前一天的日期
      const prevDate = new Date(expectedDate)
      prevDate.setDate(prevDate.getDate() - 1)
      expectedDate = getLocalDateString(prevDate)
    } else {
      break
    }
  }

  return streak
}

// GET: 获取打卡状态
export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id')
  if (!userId) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }

  try {
    const today = getLocalDateString(new Date())

    // 并行获取所有数据
    const [todayMinutes, totalCheckIns, todayCheckIn, streakDays] = await Promise.all([
      getTodayStudyMinutes(userId),
      prisma.checkIn.count({ where: { userId } }),
      prisma.checkIn.findUnique({ where: { userId_date: { userId, date: today } } }),
      getStreakDays(userId)
    ])

    return NextResponse.json({
      success: true,
      data: {
        todayMinutes,                    // 今日已学习分钟数
        totalCheckIns,                   // 累计打卡次数
        streakDays,                      // 连续打卡天数
        hasCheckedInToday: !!todayCheckIn, // 今日是否已打卡
        canCheckIn: todayMinutes >= 10 && !todayCheckIn // 是否可以打卡
      }
    })
  } catch (error) {
    console.error('获取打卡状态失败:', error)
    return NextResponse.json({ error: '获取打卡状态失败' }, { status: 500 })
  }
}

// POST: 打卡
export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-id')
  if (!userId) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }

  try {
    const today = getLocalDateString(new Date())

    // 检查今日是否已打卡
    const existingCheckIn = await prisma.checkIn.findUnique({
      where: { userId_date: { userId, date: today } }
    })

    if (existingCheckIn) {
      return NextResponse.json({ error: '今日已打卡' }, { status: 400 })
    }

    // 获取今日学习时长
    const todayMinutes = await getTodayStudyMinutes(userId)

    if (todayMinutes < 10) {
      return NextResponse.json({ 
        error: '学习时间不足10分钟，无法打卡',
        todayMinutes 
      }, { status: 400 })
    }

    // 创建打卡记录
    await prisma.checkIn.create({
      data: {
        userId,
        date: today,
        minutes: todayMinutes
      }
    })

    // 获取更新后的统计
    const [totalCheckIns, streakDays] = await Promise.all([
      prisma.checkIn.count({ where: { userId } }),
      getStreakDays(userId)
    ])

    return NextResponse.json({
      success: true,
      message: '打卡成功',
      data: {
        todayMinutes,
        totalCheckIns,
        streakDays,
        hasCheckedInToday: true
      }
    })
  } catch (error) {
    console.error('打卡失败:', error)
    return NextResponse.json({ error: '打卡失败' }, { status: 500 })
  }
}
