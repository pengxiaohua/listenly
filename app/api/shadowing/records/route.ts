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

    const total = await (prisma as any).shadowingRecord.count({ where });

    const records = await (prisma as any).shadowingRecord.findMany({
      where,
      include: {
        shadowing: {
          include: {
            shadowingSet: true
          }
        }
      },
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' }
    });

    const flattenedRecords = records.map((record: any) => ({
      id: record.id,
      score: record.score ?? null,
      createdAt: record.createdAt,
      shadowingId: record.shadowing.id,
      text: record.shadowing.text,
      setId: record.shadowing.shadowingSet.id,
      setName: record.shadowing.shadowingSet.name
    }));

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


