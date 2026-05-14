import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import {
  VIDEO_ACTIVE_WEIGHT,
  VIDEO_COUNT_THRESHOLD_SECONDS,
} from '@/lib/constants'

// 获取用户学习统计信息（生词本、错词本、学习记录）
export async function GET() {
  const user = await auth()
  if (!user) {
    return NextResponse.json({ error: '用户未登录' }, { status: 401 })
  }

  try {
    // 并行获取所有统计数据
    const [
      vocabularyWordCount,
      vocabularySentenceCount,
      wrongWordCount,
      wrongSentenceCount,
      wordSpellingCount,
      sentenceDictationCount,
      shadowingCount,
      videoAggregates,
    ] = await Promise.all([
      // 生词本单词数量
      prisma.vocabulary.count({
        where: {
          userId: user.id,
          type: 'word',
          isMastered: false
        }
      }),
      // 生词本句子数量
      prisma.vocabulary.count({
        where: {
          userId: user.id,
          type: 'sentence',
          isMastered: false
        }
      }),
      // 错词本单词数量（按 wordId 去重）
      prisma.wordRecord.findMany({
        where: {
          userId: user.id,
          errorCount: {
            gt: 0
          },
          isMastered: false,
          archived: false
        },
        select: { wordId: true },
        distinct: ['wordId'],
      }).then(records => records.length),
      // 错词本句子数量（按 sentenceId 去重）
      prisma.sentenceRecord.findMany({
        where: {
          userId: user.id,
          errorCount: {
            gt: 0
          },
          isMastered: false,
          archived: false
        },
        select: { sentenceId: true },
        distinct: ['sentenceId'],
      }).then(records => records.length),
      // 单词拼写记录数量（所有记录，不管对错）
      prisma.wordRecord.count({
        where: {
          userId: user.id
        }
      }),
      // 句子听写记录数量
      prisma.sentenceRecord.count({
        where: {
          userId: user.id
        }
      }),
      // 影子跟读的次数
      prisma.shadowingRecord.count({
        where: {
          userId: user.id
        }
      }),
      // 视听演练：按视频聚合累计有效时长，门槛 ≥30s 计为已学
      prisma.videoRecord.groupBy({
        by: ['videoId'],
        where: { userId: user.id },
        _sum: { playedSeconds: true, activeSeconds: true },
      }),
    ])

    // 视频学习数：累计 played + active*0.5 ≥ 30s 的去重视频数
    const videoLearningCount = videoAggregates.reduce((acc, v) => {
      const effective =
        (v._sum.playedSeconds ?? 0) + (v._sum.activeSeconds ?? 0) * VIDEO_ACTIVE_WEIGHT
      return acc + (effective >= VIDEO_COUNT_THRESHOLD_SECONDS ? 1 : 0)
    }, 0)

    return NextResponse.json({
      success: true,
      data: {
        vocabulary: {
          wordCount: vocabularyWordCount,
          sentenceCount: vocabularySentenceCount
        },
        wrongWords: {
          wordCount: wrongWordCount,
          sentenceCount: wrongSentenceCount
        },
        learning: {
          wordSpellingCount,
          sentenceDictationCount,
          shadowingCount,
          videoLearningCount,
        }
      }
    })
  } catch (error) {
    console.error('获取学习统计失败:', error)
    return NextResponse.json({ error: '获取统计信息失败' }, { status: 500 })
  }
}
