import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// 公开 API: 获取目录树(用于前端筛选)
export async function GET() {
  try {
    // 目录不再按 type 区分，直接返回完整树

    const catalogFirsts = await prisma.catalogFirst.findMany({
      orderBy: { displayOrder: 'asc' },
      include: {
        seconds: {
          orderBy: { displayOrder: 'asc' },
          include: {
            thirds: {
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

