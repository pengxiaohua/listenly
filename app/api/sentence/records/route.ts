import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
) {
  try {
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const filter = searchParams.get('filter') || 'all';
    const corpusId = searchParams.get('corpusId') || 'all';

    // 构建查询条件
    type WhereInput = {
      userId: string;
      isCorrect?: boolean;
      sentence?: { sentenceSetId: number };
    };

    const where: WhereInput = {
      userId: userId,
    } as const;

    if (filter === 'correct') {
      where.isCorrect = true;
    } else if (filter === 'incorrect') {
      where.isCorrect = false;
    }

    if (corpusId !== 'all') {
      where.sentence = {
        sentenceSetId: Number(corpusId),
      };
    }

    // 计算跳过的记录数
    const skip = (page - 1) * pageSize;

    // 获取总记录数
    const total = await prisma.sentenceRecord.count({
      where,
    });

    // 获取分页数据
    const records = await prisma.sentenceRecord.findMany({
      where,
      include: {
        sentence: {
          include: {
            sentenceSet: true
          }
        }
      },
      skip,
      take: pageSize,
      orderBy: {
        createdAt: 'desc',
      },
    });

    // 扁平化数据结构
    const flattenedRecords = records.map((record: {
      id: number;
      isCorrect: boolean;
      errorCount: number;
      createdAt: Date;
      sentence: {
        id: number;
        text: string;
        sentenceSet: {
          id: number;
          name: string;
        };
      };
    }) => ({
      id: record.id,
      isCorrect: record.isCorrect,
      errorCount: record.errorCount,
      createdAt: record.createdAt,
      sentenceId: record.sentence.id,
      sentence: record.sentence.text,
      corpusId: record.sentence.sentenceSet.id,
      corpusName: record.sentence.sentenceSet.name
    }));

    return NextResponse.json({
      records: flattenedRecords,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error('Error fetching records:', error);
    return NextResponse.json(
      { error: '获取记录失败' },
      { status: 500 }
    );
  }
}
