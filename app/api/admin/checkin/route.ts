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
    prisma.checkIn.count(),
    prisma.checkIn.findMany({
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ])

  // Batch-fetch usernames
  const userIds = [...new Set(rows.map(r => r.userId))]
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, userName: true },
  })
  const userMap = Object.fromEntries(users.map(u => [u.id, u.userName]))

  const records = rows.map(r => ({
    id: r.id,
    userId: r.userId,
    userName: userMap[r.userId] ?? '未知',
    minutes: r.minutes,
    createdAt: r.createdAt,
  }))

  return NextResponse.json({ records, total })
}
