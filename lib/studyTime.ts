import { prisma } from '@/lib/prisma'
import {
  VIDEO_ACTIVE_WEIGHT,
  VIDEO_COUNT_THRESHOLD_SECONDS,
} from '@/lib/constants'

type RecordType = 'word' | 'sentence' | 'shadowing'

interface StudyRecord {
  time: Date
  type: RecordType
}

interface StudyStats {
  /// 总学习时长（分钟），= 单词/句子/跟读会话估算 + 视频实际测量
  minutes: number
  wordCount: number
  sentenceCount: number
  shadowingCount: number
  /// 视听演练有效观看的去重视频数（单视频累计有效时长 ≥ 30s 计一次）
  videoCount: number
  /// 视频学习时长（分钟，已折算活跃权重）
  videoMinutes: number
}

/**
 * 根据动作型学习记录计算估算学习时长（单词/句子/跟读）。
 * 将学习记录按会话分组（间隔超过 5 分钟视为不同会话），计算实际学习时长。
 *
 * 注：本函数只处理单词/句子/跟读，不包含视频。视频时长是真实测量值，由调用方
 * 通过 calculateVideoStats 单独计算后求和。
 */
export function calculateActionStudyMinutes(records: StudyRecord[]): {
  minutes: number
  wordCount: number
  sentenceCount: number
  shadowingCount: number
} {
  if (records.length === 0) {
    return { minutes: 0, wordCount: 0, sentenceCount: 0, shadowingCount: 0 }
  }

  const sortedRecords = [...records].sort((a, b) => a.time.getTime() - b.time.getTime())

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
      if (record.type === 'word') wordCount++
      else if (record.type === 'sentence') sentenceCount++
      else shadowingCount++
    })
  })

  return {
    minutes: Math.round(totalMinutes),
    wordCount,
    sentenceCount,
    shadowingCount,
  }
}

/**
 * @deprecated 兼容旧调用，仅返回单词/句子/跟读的估算时长，不含视频。
 * 建议改用 calculateActionStudyMinutes 或 getUserStudyStats。
 */
export function calculateStudyMinutes(records: StudyRecord[]): {
  minutes: number
  wordCount: number
  sentenceCount: number
  shadowingCount: number
} {
  return calculateActionStudyMinutes(records)
}

interface VideoAggregate {
  videoId: number
  playedSeconds: number
  activeSeconds: number
}

/**
 * 根据视频学习记录聚合（已按 videoId 分组求和）计算视频时长与有效视频数。
 */
export function calculateVideoStats(aggregates: VideoAggregate[]): {
  videoMinutes: number
  videoCount: number
} {
  let totalEffectiveSeconds = 0
  let videoCount = 0
  for (const agg of aggregates) {
    const effective = agg.playedSeconds + agg.activeSeconds * VIDEO_ACTIVE_WEIGHT
    totalEffectiveSeconds += effective
    if (effective >= VIDEO_COUNT_THRESHOLD_SECONDS) {
      videoCount++
    }
  }
  return {
    videoMinutes: Math.round(totalEffectiveSeconds / 60),
    videoCount,
  }
}

/**
 * 获取指定用户在指定时间范围内的学习时长统计（合并单词/句子/跟读 + 视频）。
 */
export async function getUserStudyStats(
  userId: string,
  start: Date,
  end: Date,
): Promise<StudyStats> {
  const [wordRecords, sentenceRecords, shadowingRecords, videoAggregates] = await Promise.all([
    prisma.wordRecord.findMany({
      where: { userId, createdAt: { gte: start, lte: end } },
      select: { createdAt: true },
    }),
    prisma.sentenceRecord.findMany({
      where: { userId, createdAt: { gte: start, lte: end } },
      select: { createdAt: true },
    }),
    prisma.$queryRaw<{ createdAt: Date }[]>`
      SELECT "createdAt"
      FROM "ShadowingRecord"
      WHERE "userId" = ${userId}
        AND "createdAt" >= ${start}
        AND "createdAt" <= ${end}
    `,
    prisma.videoRecord.groupBy({
      by: ['videoId'],
      where: { userId, createdAt: { gte: start, lte: end } },
      _sum: { playedSeconds: true, activeSeconds: true },
    }),
  ])

  const allRecords: StudyRecord[] = [
    ...wordRecords.map(r => ({ time: r.createdAt, type: 'word' as const })),
    ...sentenceRecords.map(r => ({ time: r.createdAt, type: 'sentence' as const })),
    ...shadowingRecords.map(r => ({ time: r.createdAt, type: 'shadowing' as const })),
  ]
  const action = calculateActionStudyMinutes(allRecords)

  const video = calculateVideoStats(
    videoAggregates.map(v => ({
      videoId: v.videoId,
      playedSeconds: v._sum.playedSeconds ?? 0,
      activeSeconds: v._sum.activeSeconds ?? 0,
    })),
  )

  return {
    minutes: action.minutes + video.videoMinutes,
    wordCount: action.wordCount,
    sentenceCount: action.sentenceCount,
    shadowingCount: action.shadowingCount,
    videoCount: video.videoCount,
    videoMinutes: video.videoMinutes,
  }
}

/**
 * 获取今日学习时长（合并所有维度）
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
