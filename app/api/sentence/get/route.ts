import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const corpusId = searchParams.get('corpusId')

  if (!corpusId) {
    return NextResponse.json({ error: '参数缺失' }, { status: 400 })
  }

  const userId = req.headers.get('x-user-id')
  if (!userId) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }

  try {
    // 获取一个随机的未完成句子
    const sentence = await prisma.sentence.findFirst({
      where: {
        corpusId: Number(corpusId),
        // 不在用户已完成的句子中
        NOT: {
          sentenceRecords: {
            some: {
              userId: userId
            }
          }
        }
      },
      orderBy: {
        id: 'asc' // PostgreSQL会将此转换为随机排序
      }
    })

    if (!sentence) {
      return NextResponse.json({ completed: true })
    }

    return NextResponse.json(sentence)
  } catch (error) {
    console.error('获取句子失败:', error)
    return NextResponse.json({ error: '获取句子失败' }, { status: 500 })
  }
}
