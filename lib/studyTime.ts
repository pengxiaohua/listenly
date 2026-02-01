import { prisma } from '@/lib/prisma'

type RecordType = 'word' | 'sentence' | 'shadowing'

interface StudyRecord {
  time: Date
  type: RecordType
}

interface StudyStats {
  minutes: number
  wordCount: number
  sentenceCount: number
  shadowingCount: number
}

/**
 * 根据学习记录计算学习时长
 * 将学习记录按会话分组（间隔超过5分钟视为不同会话），计算实际学习时长
 */
export function calculateStudyMinutes(records: StudyRecord[]): StudyStats {
  if (records.length === 0) {
    return { minutes: 0, wordCount: 0, sentenceCount: 0, shadowingCount: 0 }
  }

  // 按时间排序
  const sortedRecords = [...records].sort((a, b) => a.time.getTime() - b.time.getTime())

  // 将学习记录分组为学习会话（间隔超过5分钟视为不同会话）
  const sessions: Array<{ records: StudyRecord[] }> = []
  let currentSession: StudyRecord[] = []

  for (let i = 0; i < sortedRecords.length; i++) {
    const record = sortedRecords[i]

    if (currentSession.length === 0) {
      currentSession.push(record)
    } else {
      const lastRecord = currentSession[currentSession.length - 1]
      const timeDiff = record.time.getTime() - lastRecord.time.getTime()
      const minutesDiff = timeDiff / (1000 * 60)

      if (minutesDiff <= 5) {
        currentSession.push(record)
      } else {
        sessions.push({ records: [...currentSession] })
        currentSession = [record]
      }
    }
  }

  if (currentSession.length > 0) {
    sessions.push({ records: currentSession })
  }

  // 计算总学习时长和统计
  let totalMinutes = 0
  let wordCount = 0
  let sentenceCount = 0
  let shadowingCount = 0

  sessions.forEach(session => {
    if (session.records.length === 1) {
      const record = session.records[0]
      const baseMinutes = record.type === 'word' ? 1 : (record.type === 'sentence' ? 2 : 3)
      totalMinutes += baseMinutes
    } else {
      const startTime = session.records[0].time
      const endTime = session.records[session.records.length - 1].time
      const timeSpanMs = endTime.getTime() - startTime.getTime()
      const timeSpanMinutes = Math.round(timeSpanMs / (1000 * 60))
      totalMinutes += Math.max(timeSpanMinutes, 1)
    }

    session.records.forEach(record => {
      if (record.type === 'word') {
        wordCount++
      } else if (record.type === 'sentence') {
        sentenceCount++
      } else {
        shadowingCount++
      }
    })
  })

  return {
    minutes: Math.round(totalMinutes),
    wordCount,
    sentenceCount,
    shadowingCount
  }
}

/**
 * 获取指定用户在指定时间范围内的学习时长
 */
export async function getUserStudyStats(
  userId: string,
  start: Date,
  end: Date
): Promise<StudyStats> {
  // 获取所有学习记录
  const [wordRecords, sentenceRecords, shadowingRecords] = await Promise.all([
    prisma.wordRecord.findMany({
      where: {
        userId,
        createdAt: { gte: start, lte: end }
      },
      select: { createdAt: true }
    }),
    prisma.sentenceRecord.findMany({
      where: {
        userId,
        createdAt: { gte: start, lte: end }
      },
      select: { createdAt: true }
    }),
    prisma.$queryRaw<{ createdAt: Date }[]>`
      SELECT "createdAt"
      FROM "ShadowingRecord"
      WHERE "userId" = ${userId}
        AND "createdAt" >= ${start}
        AND "createdAt" <= ${end}
    `
  ])

  // 合并所有记录
  const allRecords: StudyRecord[] = [
    ...wordRecords.map(r => ({ time: r.createdAt, type: 'word' as const })),
    ...sentenceRecords.map(r => ({ time: r.createdAt, type: 'sentence' as const })),
    ...shadowingRecords.map(r => ({ time: r.createdAt, type: 'shadowing' as const }))
  ]

  return calculateStudyMinutes(allRecords)
}

/**
 * 获取今日学习时长
 */
export async function getTodayStudyMinutes(userId: string): Promise<number> {
  const now = new Date()
  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date(now)
  todayEnd.setHours(23, 59, 59, 999)

  const stats = await getUserStudyStats(userId, todayStart, todayEnd)
  return stats.minutes
}
