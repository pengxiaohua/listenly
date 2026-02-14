import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

// 获取用户句子错词本列表
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
    // 方案改进：使用 groupBy 先获取去重后的 sentenceId 列表和对应的最新时间，然后在内存中排序分页
    // 这样可以避免 distinct 和 orderBy 在数据库层面的冲突，同时确保按最近错误时间排序

    // 1. 获取所有符合条件的 sentenceId 和最新记录时间
    type GroupedSentenceResult = {
      sentenceId: number;
      _max: {
        createdAt: Date | null;
        id: number | null;
      };
    };

    const groupedRaw = await prisma.sentenceRecord.groupBy({
      by: ['sentenceId'],
      where: {
        userId: user.id,
        errorCount: { gt: 0 },
        isMastered: false,
        archived: false,
      },
      _max: {
        createdAt: true,
        id: true, // 获取最新的记录ID
      },
    });

    const grouped = groupedRaw as unknown as GroupedSentenceResult[];

    // 2. 在内存中按最近时间倒序排序
    grouped.sort((a, b) => {
      const timeA = a._max.createdAt ? new Date(a._max.createdAt).getTime() : 0;
      const timeB = b._max.createdAt ? new Date(b._max.createdAt).getTime() : 0;
      return timeB - timeA;
    });

    const totalCount = grouped.length;

    // 3. 分页切片
    const pagedGroups = grouped.slice(offset, offset + limit);
    
    // 4. 获取详细数据
    // 我们使用 _max.id (最新记录的ID) 来获取记录，这样能确保拿到的是最新状态
    const recordIds = pagedGroups.map(g => g._max.id).filter((id): id is number => id !== null);
    
    type SentenceRecordWithDetails = Prisma.SentenceRecordGetPayload<{
      include: {
        sentence: {
          include: {
            sentenceSet: true,
          },
        },
      }
    }>;

    let sentenceRecords: SentenceRecordWithDetails[] = [];
    if (recordIds.length > 0) {
      const records = await prisma.sentenceRecord.findMany({
        where: {
          id: { in: recordIds }
        },
        include: {
          sentence: {
            include: {
              sentenceSet: true,
            },
          },
        },
      });

      // 5. 按 recordIds 的顺序重新排列结果 (因为 findMany 不保证返回顺序)
      // explicit type for Map to avoid inferred type issues if any
      type RecordType = typeof records[number];
      const recordMap = new Map<number, RecordType>(records.map(r => [r.id, r]));
      sentenceRecords = recordIds.map(id => recordMap.get(id)).filter((r): r is SentenceRecordWithDetails => r !== undefined);
    }

    return NextResponse.json({
      success: true,
      data: sentenceRecords,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error('获取句子错词本失败:', error);
    return NextResponse.json({ error: '获取句子错词本失败' }, { status: 500 });
  }
}

    // 更新句子错词的掌握状态
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

    // 1. 先查找该记录对应的 sentenceId
    const record = await prisma.sentenceRecord.findUnique({
      where: {
        id: Number(id),
        userId: user.id,
      },
      select: { sentenceId: true }
    });

    if (!record) {
      return NextResponse.json({ error: '记录不存在' }, { status: 404 });
    }

    // 2. 更新该用户对该句子的所有记录状态
    // 这样可以确保"移除"时，所有重复的错题记录都被标记为已掌握
    const result = await prisma.sentenceRecord.updateMany({
      where: {
        userId: user.id,
        sentenceId: record.sentenceId,
        // 如果是标记为已掌握，则更新所有未掌握的；如果是取消掌握，则更新所有已掌握的
        // 这里简化为更新所有记录，或者根据业务需求调整
        // 既然是"错词本"的操作，通常是移除(mastered=true)
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
    console.error('更新句子错词状态失败:', error);
    return NextResponse.json({ error: '更新句子错词状态失败' }, { status: 500 });
  }
}
