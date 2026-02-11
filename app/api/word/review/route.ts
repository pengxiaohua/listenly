import { NextRequest, NextResponse } from 'next/server';
import { Word } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const user = await auth();
  if (!user) {
    return NextResponse.json({ error: '用户未登录' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = parseInt(searchParams.get('offset') || '0');

  try {
    // 1. 获取所有符合条件的 wordId 和最新记录时间
    // Define the type for the grouped result to avoid implicit any errors
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

    // Deduplicate by word text to avoid counting same word from different sets multiple times
    const allWordIds = grouped.map((g) => g.wordId);
    
    // Fetch word texts for deduplication
    // Use select to minimize data transfer
    const wordTexts = await prisma.word.findMany({
      where: { id: { in: allWordIds } },
      select: { id: true, word: true }
    });
    
    const wordTextMap = new Map<string, string>(wordTexts.map((w) => [w.id, w.word]));
    const seenTexts = new Set<string>();
    const uniqueGrouped: GroupedResult[] = [];
    
    for (const group of grouped) {
      const text = wordTextMap.get(group.wordId);
      // Only include if we haven't seen this word text before
      // This prioritizes the most recently attempted version (due to sort order)
      if (text) {
        const normalizedText = text.trim();
        if (!seenTexts.has(normalizedText)) {
          seenTexts.add(normalizedText);
          uniqueGrouped.push(group);
        }
      }
    }

    const totalCount = uniqueGrouped.length;

    // 3. 分页切片
    const pagedGroups = uniqueGrouped.slice(offset, offset + limit);

    // 4. 获取详细数据
    const recordIds = pagedGroups.map((g) => g._max.id).filter((id): id is string => id !== null);

    let words: Word[] = [];
    if (recordIds.length > 0) {
      const records = await prisma.wordRecord.findMany({
        where: { id: { in: recordIds } },
        include: { word: true }
      });

      const recordMap = new Map(records.map((r) => [r.id, r]));
      words = recordIds
        .map(id => recordMap.get(id)?.word)
        .filter((w): w is Word => w !== undefined);
    }

    return NextResponse.json({
      words,
      total: totalCount,
      hasMore: offset + words.length < totalCount
    });
  } catch (error) {
    console.error('获取单词错词本复习数据失败:', error);
    return NextResponse.json({ error: '获取复习数据失败', words: [], total: 0, hasMore: false }, { status: 500 });
  }
}
