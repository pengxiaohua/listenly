import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

// 获取用户单词错词本列表
export async function GET(request: NextRequest) {
  const user = await auth();
  if (!user) {
    return NextResponse.json({ error: '用户未登录' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = (page - 1) * limit;

  try {
    // 1. 获取所有符合条件的 wordId 和最新记录时间
    type GroupedResult = {
      wordId: string;
      _max: {
        lastAttempt: Date | null;
        id: string | null;
      };
    };

    const groupedRaw = await prisma.wordRecord.groupBy({
      by: ['wordId'],
      where: {
        userId: user.id,
        errorCount: { gt: 0 },
        isMastered: false,
        archived: false,
      },
      _max: {
        lastAttempt: true,
        id: true,
      },
    });

    const grouped = groupedRaw as unknown as GroupedResult[];

    // 2. 在内存中按最近时间倒序排序
    grouped.sort((a, b) => {
      const timeA = a._max.lastAttempt ? new Date(a._max.lastAttempt).getTime() : 0;
      const timeB = b._max.lastAttempt ? new Date(b._max.lastAttempt).getTime() : 0;
      return timeB - timeA;
    });

    const totalCount = grouped.length;

    // 3. 分页切片
    const pagedGroups = grouped.slice(offset, offset + limit);

    // 4. 获取详细数据
    const recordIds = pagedGroups.map(g => g._max.id).filter((id): id is string => id !== null);

    type WordRecordWithWord = Prisma.WordRecordGetPayload<{
      include: { word: true }
    }>;
    let wordRecords: WordRecordWithWord[] = [];
    if (recordIds.length > 0) {
      const records = await prisma.wordRecord.findMany({
        where: {
          id: { in: recordIds }
        },
        include: {
          word: true,
        },
      });

      // 5. 按 recordIds 的顺序重新排列结果
      type RecordType = typeof records[number];
      const recordMap = new Map<string, RecordType>(records.map(r => [r.id, r]));
      wordRecords = recordIds.map(id => recordMap.get(id)).filter((r): r is WordRecordWithWord => r !== undefined);
    }

    return NextResponse.json({
      success: true,
      data: wordRecords,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error('获取单词错词本失败:', error);
    return NextResponse.json({ error: '获取单词错词本失败' }, { status: 500 });
  }
}

    // 更新单词错词的掌握状态
export async function PATCH(request: NextRequest) {
  const user = await auth();
  if (!user) {
    return NextResponse.json({ error: '用户未登录' }, { status: 401 });
  }

  try {
    const { id, isMastered } = await request.json();

    if (!id || typeof isMastered !== 'boolean') {
      return NextResponse.json({ error: '参数错误' }, { status: 400 });
    }

    // 1. 先查找该记录对应的 wordId
    const record = await prisma.wordRecord.findUnique({
      where: {
        id: id,
        userId: user.id,
      },
      select: { wordId: true }
    });

    if (!record) {
      return NextResponse.json({ error: '记录不存在' }, { status: 404 });
    }

    // 2. 更新该用户对该单词的所有记录状态
    const result = await prisma.wordRecord.updateMany({
      where: {
        userId: user.id,
        wordId: record.wordId,
      },
      data: {
        isMastered,
      },
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('更新单词错词状态失败:', error);
    return NextResponse.json({ error: '更新单词错词状态失败' }, { status: 500 });
  }
}
