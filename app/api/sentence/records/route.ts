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

    // 构建查询条件，用户输入不为空
    type WhereInput = {
      userId: string;
      userInput: { not: string };
      correct?: boolean;
      sentence?: { corpusId: number };
    };

    const where: WhereInput = {
      userId: userId,
      userInput: {
        not: '',
      },
    } as const;

    if (filter === 'correct') {
      where.correct = true;
    } else if (filter === 'incorrect') {
      where.correct = false;
    }

    if (corpusId !== 'all') {
      where.sentence = {
        corpusId: Number(corpusId),
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
            corpus: true
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
      correct: boolean;
      errorCount: number;
      createdAt: Date;
      sentence: {
        id: number;
        text: string;
        corpus: {
          id: number;
          name: string;
        };
      };
    }) => ({
      id: record.id,
      correct: record.correct,
      errorCount: record.errorCount,
      createdAt: record.createdAt,
      sentenceId: record.sentence.id,
      sentence: record.sentence.text,
      corpusId: record.sentence.corpus.id,
      corpusName: record.sentence.corpus.name
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
