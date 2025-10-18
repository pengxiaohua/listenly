import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

// 获取用户最近学习分类记录
export async function GET() {
  const user = await auth()
  if (!user) {
    return NextResponse.json({ error: '用户未登录' }, { status: 401 })
  }

  try {
    // 获取最近的学习记录，按分类统计
    const [recentWordRecords, recentSentenceRecords] = await Promise.all([
      // 最近单词学习记录，按分类分组
      prisma.wordRecord.findMany({
        where: {
          userId: user.id
        },
        include: {
          word: {
            include: {
              wordSet: true
            }
          }
        },
        orderBy: {
          lastAttempt: 'desc'
        }
      }),
      // 最近句子学习记录，按语料库分组
      prisma.sentenceRecord.findMany({
        where: {
          userId: user.id,
          userInput: {
            not: ''
          }
        },
        include: {
          sentence: {
            include: {
              sentenceSet: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      })
    ])

    // 按分类统计单词学习记录
    const wordCategories = new Map<string, {
      type: 'word'
      category: string
      categoryName: string
      lastAttempt: Date
      totalCount: number
      correctCount: number
    }>()

    recentWordRecords.forEach(record => {
      const category = record.word.wordSet.slug
      const categoryName = record.word.wordSet.name
      const key = `word-${category}`

      if (!wordCategories.has(key)) {
        wordCategories.set(key, {
          type: 'word',
          category,
          categoryName,
          lastAttempt: record.lastAttempt,
          totalCount: 0,
          correctCount: 0
        })
      }

      const categoryData = wordCategories.get(key)!
      categoryData.totalCount++
      if (record.isCorrect) {
        categoryData.correctCount++
      }
      // 更新最新学习时间
      if (record.lastAttempt > categoryData.lastAttempt) {
        categoryData.lastAttempt = record.lastAttempt
      }
    })

    // 按分类统计句子学习记录
    const sentenceCategories = new Map<string, {
      id: number
      type: 'sentence'
      category: string
      categoryName: string
      lastAttempt: Date
      totalCount: number
      correctCount: number
      slug: string
    }>()

    recentSentenceRecords.forEach(record => {
      const category = record.sentence.sentenceSet.name
      const categoryName = record.sentence.sentenceSet.description || record.sentence.sentenceSet.name
      const key = `sentence-${category}`

      if (!sentenceCategories.has(key)) {
        sentenceCategories.set(key, {
          id: record.sentence.sentenceSet.id,
          type: 'sentence',
          category,
          categoryName,
          lastAttempt: record.createdAt,
          totalCount: 0,
          correctCount: 0,
          slug: record.sentence.sentenceSet.slug
        })
      }

      const categoryData = sentenceCategories.get(key)!
      categoryData.totalCount++
      if (record.correct) {
        categoryData.correctCount++
      }
      // 更新最新学习时间
      if (record.createdAt > categoryData.lastAttempt) {
        categoryData.lastAttempt = record.createdAt
      }
    })

    // 合并所有分类并按时间排序
    const allCategories = [
      ...Array.from(wordCategories.values()),
      ...Array.from(sentenceCategories.values())
    ]

    // 按时间排序，取最近3个分类
    const recentLearning = allCategories
      .sort((a, b) => b.lastAttempt.getTime() - a.lastAttempt.getTime())
      .slice(0, 3)

    return NextResponse.json({
      success: true,
      data: recentLearning
    })
  } catch (error) {
    console.error('获取最近学习分类失败:', error)
    return NextResponse.json({ error: '获取最近学习分类失败' }, { status: 500 })
  }
}

