import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

// 获取生词本句子复习数据（类似 /api/sentence/review，但数据来源是 Vocabulary 表）
export async function GET(request: NextRequest) {
  const user = await auth();
  if (!user) {
    return NextResponse.json({ error: '用户未登录' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const excludeIdsParam = searchParams.get('excludeIds');
  let excludeIds: number[] = [];
  if (excludeIdsParam) {
    excludeIds = excludeIdsParam.split(',').map(id => parseInt(id)).filter(id => !isNaN(id));
  }

  try {
    // List mode (for counting or list display)
    const limitParam = searchParams.get('limit');
    if (limitParam) {
      const limit = parseInt(limitParam);
      const offset = parseInt(searchParams.get('offset') || '0');

      const vocabularies = await prisma.vocabulary.findMany({
        where: {
          userId: user.id,
          type: 'sentence',
          isMastered: false,
        },
        include: {
          sentence: {
            include: { sentenceSet: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      const totalCount = vocabularies.length;
      const paged = vocabularies.slice(offset, offset + limit);

      const sentences = paged
        .filter((v) => v.sentence)
        .map((v) => ({
          ...v.sentence!,
          ossDir: v.sentence!.sentenceSet.ossDir,
        }));

      return NextResponse.json({
        sentences,
        total: totalCount,
        hasMore: offset + sentences.length < totalCount,
      });
    }

    // Fetch-next mode (one by one for review practice)
    const vocabularies = await prisma.vocabulary.findMany({
      where: {
        userId: user.id,
        type: 'sentence',
        isMastered: false,
        ...(excludeIds.length > 0 && { sentenceId: { notIn: excludeIds } }),
      },
      include: {
        sentence: {
          include: { sentenceSet: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (vocabularies.length === 0) {
      return NextResponse.json({ completed: true });
    }

    const vocab = vocabularies[0];
    if (!vocab.sentence) {
      return NextResponse.json({ completed: true });
    }

    return NextResponse.json({
      ...vocab.sentence,
      ossDir: vocab.sentence.sentenceSet.ossDir,
    });
  } catch (error) {
    console.error('获取生词本句子复习数据失败:', error);
    return NextResponse.json({ error: '获取复习数据失败' }, { status: 500 });
  }
}
