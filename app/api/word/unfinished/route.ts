import { NextResponse } from "next/server";
import { prisma } from '@/lib/prisma'
import { finishedWordRecordFilter, getVirtualGroupWordIds } from '@/lib/wordGroupUtils'

export async function GET(request: Request) {
  try {
    const userId = request.headers.get('x-user-id');
    const { searchParams } = new URL(request.url);
    const wordSetSlug = searchParams.get("wordSet") || searchParams.get("category");
    const groupIdParam = searchParams.get('groupId');
    const parsedGroupId = groupIdParam ? parseInt(groupIdParam) : null;
    const limitParam = searchParams.get("limit");
    const isGrouped = parsedGroupId !== null && !Number.isNaN(parsedGroupId);
    // 真实/虚拟分组时一次性加载组内未完成词，其他情况默认 20
    const limit = limitParam ? parseInt(limitParam) : (isGrouped ? 1000 : 20);
    const offset = isGrouped ? 0 : parseInt(searchParams.get("offset") || "0");

    if (!wordSetSlug) {
      return NextResponse.json({ error: "缺少词集参数" }, { status: 400 });
    }

    const wordSet = await prisma.wordSet.findUnique({
      where: { slug: wordSetSlug },
      select: { id: true }
    });

    if (!wordSet) {
      return NextResponse.json({ error: "词集不存在" }, { status: 404 });
    }

    let virtualWordIds: string[] | undefined;
    if (parsedGroupId !== null && parsedGroupId < 0) {
      const virtualOrder = -parsedGroupId;
      virtualWordIds = await getVirtualGroupWordIds(wordSet.id, virtualOrder);
      if (virtualWordIds.length === 0) {
        return NextResponse.json({ words: [], total: 0, hasMore: false });
      }
    }

    const recordFilter = finishedWordRecordFilter(userId ?? '');

    // 获取该分类下用户尚未正确拼写的单词，支持分页
    // 逻辑：返回没有任何「已完成」记录的单词（与分组进度统计一致）
    const where = {
      wordSetId: wordSet.id,
      ...(parsedGroupId !== null && parsedGroupId > 0 ? { wordGroupId: parsedGroupId } : {}),
      ...(virtualWordIds ? { id: { in: virtualWordIds } } : {}),
      records: {
        none: recordFilter,
      },
    };

    const words = await prisma.word.findMany({
      where,
      select: {
        id: true,
        word: true,
        phoneticUS: true,
        phoneticUK: true,
        definition: true,
        translation: true,
        exchange: true,
        wordSetId: true,
        wordSet: {
          select: {
            slug: true,
            name: true,
            isPro: true
          }
        }
      },
      take: limit,
      skip: offset,
      orderBy: isGrouped && parsedGroupId !== null && parsedGroupId > 0
        ? [{ groupIndex: 'asc' }, { id: 'asc' }]
        : virtualWordIds
          ? [{ index: 'asc' }, { id: 'asc' }]
          : [{ index: 'asc' }, { id: 'asc' }]
    });

    const total = await prisma.word.count({ where });

    return NextResponse.json({
      words,
      total,
      hasMore: offset + words.length < total
    });
  } catch (error) {
    console.error("获取单词失败:", error);
    return NextResponse.json({ error: "获取单词失败" }, { status: 500 });
  }
}
