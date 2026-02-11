import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const user = await auth();
  if (!user) {
    return NextResponse.json({ error: '用户未登录' }, { status: 401 });
  }

  // Optional: exclude specific sentence IDs to avoid immediate repetition
  const { searchParams } = new URL(request.url);
  const excludeId = searchParams.get('excludeId');
  const excludeIdsParam = searchParams.get('excludeIds');
  let excludeIds: number[] = [];

  if (excludeIdsParam) {
    excludeIds = excludeIdsParam.split(',').map(id => parseInt(id)).filter(id => !isNaN(id));
  } else if (excludeId) {
    excludeIds = [parseInt(excludeId)];
  }

  try {
    // Check if we are in "list mode" (e.g. for counting or list display)
    const limitParam = searchParams.get('limit');
    if (limitParam) {
      const limit = parseInt(limitParam);
      const offset = parseInt(searchParams.get('offset') || '0');

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
          id: true,
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
      const recordIds = pagedGroups.map((g) => g._max.id).filter((id): id is number => id !== null);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let sentences: any[] = [];
      if (recordIds.length > 0) {
        const records = await prisma.sentenceRecord.findMany({
          where: { id: { in: recordIds } },
          include: {
            sentence: {
              include: {
                sentenceSet: true
              }
            }
          }
        });

        type RecordType = typeof records[number];
        const recordMap = new Map<number, RecordType>(records.map((r) => [r.id, r]));
        sentences = recordIds.map(id => {
          const r = recordMap.get(id);
          if (!r) return null;
          return {
            ...r.sentence,
            ossDir: r.sentence.sentenceSet.ossDir
          };
        }).filter(Boolean);
      }

      return NextResponse.json({
        sentences,
        total: totalCount,
        hasMore: offset + sentences.length < totalCount
      });
    }

    // Existing "Fetch Next" logic (random/sequential one by one)
    // Use groupBy to ensure distinct sentences and consistent ordering
    const groupedRaw = await prisma.sentenceRecord.groupBy({
      by: ['sentenceId'],
      where: {
        userId: user.id,
        errorCount: { gt: 0 },
        isMastered: false,
        archived: false,
        sentenceId: excludeIds.length > 0 ? { notIn: excludeIds } : undefined,
      },
      _max: {
        createdAt: true,
        id: true,
      },
    });

    // Define the type again or reuse if possible. Since scopes are different blocks (if block above),
    // but here we are in the main function scope.
    // However, the previous definition was inside `if (limitParam)`.
    // So we need to define it again or move it up.
    // To be safe and simple, I will define it again.
    type GroupedSentenceResult = {
      sentenceId: number;
      _max: {
        createdAt: Date | null;
        id: number | null;
      };
    };

    const grouped = groupedRaw as unknown as GroupedSentenceResult[];

    if (grouped.length === 0) {
      // If we have excluded IDs and found nothing, it implies we've reviewed all available sentences for this session.
      // We should NOT retry without exclusions, as that would show duplicates.
      return NextResponse.json({ completed: true });
    }

    // Sort to find the most recent one
    grouped.sort((a, b) => {
      const timeA = a._max.createdAt ? new Date(a._max.createdAt).getTime() : 0;
      const timeB = b._max.createdAt ? new Date(b._max.createdAt).getTime() : 0;
      return timeB - timeA;
    });

    const targetId = grouped[0]._max.id;
    if (!targetId) {
      return NextResponse.json({ completed: true });
    }

    const record = await prisma.sentenceRecord.findUnique({
      where: { id: targetId },
      include: {
        sentence: {
          include: {
            sentenceSet: true
          }
        },
      },
    });

    if (!record) {
       return NextResponse.json({ completed: true });
    }

    return NextResponse.json({
      ...record.sentence,
      ossDir: record.sentence.sentenceSet.ossDir
    });
  } catch (error) {
    console.error('获取句子错词本复习数据失败:', error);
    return NextResponse.json({ error: '获取复习数据失败' }, { status: 500 });
  }
}
