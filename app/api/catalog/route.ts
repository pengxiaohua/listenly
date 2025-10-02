import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// 公开 API: 获取目录树(用于前端筛选)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') // 'WORD' | 'SENTENCE'

    if (!type || (type !== 'WORD' && type !== 'SENTENCE')) {
      return NextResponse.json({ error: 'type参数必须是WORD或SENTENCE' }, { status: 400 })
    }

    const catalogFirsts = await prisma.catalogFirst.findMany({
      where: { type: type as 'WORD' | 'SENTENCE' },
      orderBy: { displayOrder: 'asc' },
      include: {
        seconds: {
          where: { type: type as 'WORD' | 'SENTENCE' },
          orderBy: { displayOrder: 'asc' },
          include: {
            thirds: {
              where: { type: type as 'WORD' | 'SENTENCE' },
              orderBy: { displayOrder: 'asc' }
            }
          }
        }
      }
    })

    return NextResponse.json({ success: true, data: catalogFirsts })
  } catch (error) {
    console.error('获取目录树失败:', error)
    return NextResponse.json({ error: '获取目录树失败' }, { status: 500 })
  }
}

