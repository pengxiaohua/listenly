import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const user = await auth()
  if (!user?.isAdmin) {
    return NextResponse.json({ error: '无权限' }, { status: 403 })
  }

  const { searchParams } = request.nextUrl
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') ?? '20')))

  const [total, rows] = await Promise.all([
    prisma.vocabAssessment.count(),
    prisma.vocabAssessment.findMany({
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { user: { select: { userName: true } } },
    }),
  ])

  const records = rows.map(r => ({
    id: r.id,
    userId: r.userId,
    userName: r.user.userName,
    finalVocab: r.finalVocab,
    cefrLevel: r.cefrLevel,
    mode: r.mode,
    createdAt: r.createdAt,
  }))

  return NextResponse.json({ records, total })
}
