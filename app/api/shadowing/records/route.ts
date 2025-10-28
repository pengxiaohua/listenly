import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const setId = searchParams.get('setId') || 'all';

    type WhereInput = {
      userId: string;
      shadowing?: { shadowingSetId: number };
    };

    const where: WhereInput = {
      userId: userId,
    } as const;

    if (setId !== 'all') {
      where.shadowing = { shadowingSetId: Number(setId) };
    }

    const skip = (page - 1) * pageSize;

    const total = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint AS count FROM "ShadowingRecord" sr
      ${setId !== 'all' ? Prisma.sql`JOIN "Shadowing" s ON s.id = sr."shadowingId"` : Prisma.sql``}
      WHERE sr."userId" = ${userId}
      ${setId !== 'all' ? Prisma.sql`AND s."shadowingSetId" = ${Number(setId)}` : Prisma.sql``}
    `.then(rows => Number(rows[0]?.count ?? 0));

    const records = await prisma.$queryRaw<{
      id: number;
      score: number | null;
      createdAt: Date;
      shadowingId: number;
      text: string;
      setId: number;
      setName: string;
    }[]>`
      SELECT sr.id,
             sr.score,
             sr."createdAt",
             s.id AS "shadowingId",
             s.text,
             ss.id AS "setId",
             ss.name AS "setName"
      FROM "ShadowingRecord" sr
      JOIN "Shadowing" s ON s.id = sr."shadowingId"
      JOIN "ShadowingSet" ss ON ss.id = s."shadowingSetId"
      WHERE sr."userId" = ${userId}
      ${setId !== 'all' ? Prisma.sql`AND ss.id = ${Number(setId)}` : Prisma.sql``}
      ORDER BY sr."createdAt" DESC
      OFFSET ${skip}
      LIMIT ${pageSize}
    `;

    const flattenedRecords = records;

    return NextResponse.json({
      records: flattenedRecords,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error('Error fetching shadowing records:', error);
    return NextResponse.json(
      { error: '获取记录失败' },
      { status: 500 }
    );
  }
}


