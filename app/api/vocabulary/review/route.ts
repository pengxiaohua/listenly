import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

// 获取生词本单词复习数据（类似 /api/word/review，但数据来源是 Vocabulary 表）
export async function GET(request: NextRequest) {
  const user = await auth();
  if (!user) {
    return NextResponse.json({ error: '用户未登录' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = parseInt(searchParams.get('offset') || '0');

  try {
    // 获取用户生词本中未掌握的单词
    const vocabularies = await prisma.vocabulary.findMany({
      where: {
        userId: user.id,
        type: 'word',
        isMastered: false,
      },
      include: {
        word: {
          include: {
            wordSet: { select: { slug: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 按单词文本去重
    const seenTexts = new Set<string>();
    const uniqueVocabs: typeof vocabularies = [];
    for (const v of vocabularies) {
      if (v.word) {
        const normalized = v.word.word.trim();
        if (!seenTexts.has(normalized)) {
          seenTexts.add(normalized);
          uniqueVocabs.push(v);
        }
      }
    }

    const totalCount = uniqueVocabs.length;
    const paged = uniqueVocabs.slice(offset, offset + limit);

    const words = paged
      .filter((v) => v.word)
      .map((v) => ({
        ...v.word!,
        category: v.word!.wordSet?.slug || '',
      }));

    return NextResponse.json({
      words,
      total: totalCount,
      hasMore: offset + words.length < totalCount,
    });
  } catch (error) {
    console.error('获取生词本单词复习数据失败:', error);
    return NextResponse.json({ error: '获取复习数据失败', words: [], total: 0, hasMore: false }, { status: 500 });
  }
}
