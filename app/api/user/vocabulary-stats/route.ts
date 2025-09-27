import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

// 获取用户生词本和错词本统计信息
export async function GET(request: NextRequest) {
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
      wrongSentenceCount
    ] = await Promise.all([
      // 生词本单词数量
      prisma.vocabulary.count({
        where: {
          userId: user.id,
          type: 'word'
        }
      }),
      // 生词本句子数量
      prisma.vocabulary.count({
        where: {
          userId: user.id,
          type: 'sentence'
        }
      }),
      // 错词本单词数量
      prisma.wordRecord.count({
        where: {
          userId: user.id,
          errorCount: {
            gt: 0
          }
        }
      }),
      // 错词本句子数量
      prisma.sentenceRecord.count({
        where: {
          userId: user.id,
          errorCount: {
            gt: 0
          }
        }
      })
    ])

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
        }
      }
    })
  } catch (error) {
    console.error('获取生词本和错词本统计失败:', error)
    return NextResponse.json({ error: '获取统计信息失败' }, { status: 500 })
  }
}
