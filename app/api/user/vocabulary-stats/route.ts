import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

// 获取用户学习统计信息（生词本、错词本、学习记录）
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
      wrongSentenceCount,
      wordSpellingCount,
      sentenceDictationCount
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
      }),
      // 单词拼写记录数量（所有记录，不管对错）
      prisma.wordRecord.count({
        where: {
          userId: user.id
        }
      }),
      // 句子听写记录数量（有用户输入的记录）
      prisma.sentenceRecord.count({
        where: {
          userId: user.id,
          userInput: {
            not: ''
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
        },
        learning: {
          wordSpellingCount,
          sentenceDictationCount
        }
      }
    })
  } catch (error) {
    console.error('获取学习统计失败:', error)
    return NextResponse.json({ error: '获取统计信息失败' }, { status: 500 })
  }
}
