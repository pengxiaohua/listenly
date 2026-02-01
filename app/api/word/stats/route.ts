import { NextResponse } from "next/server";
import { prisma } from '@/lib/prisma'


export async function GET(request: Request) {
  const userId = request.headers.get('x-user-id');
  try {
    const { searchParams } = new URL(request.url);
    const wordSetSlug = searchParams.get("wordSet") || searchParams.get("category");

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

    // 获取该词集的总单词数
    const totalCount = await prisma.word.count({
      where: { wordSetId: wordSet.id },
    });

    // 获取用户在该分类中已完成的单词数（按 wordId 去重，避免重复计数）
    const completedRecords = await prisma.wordRecord.findMany({
      where: {
        userId: userId ?? '',
        isCorrect: true,
        archived: false,
        word: {
          wordSetId: wordSet.id,
        },
      },
      select: { wordId: true },
      distinct: ['wordId'],
    });
    const completedCount = completedRecords.length;

    return NextResponse.json({
      success: true,
      data: {
        total: totalCount,
        completed: completedCount,
      },
    });
  } catch (error) {
    console.error("获取统计信息失败:", error);
    return NextResponse.json(
      {
        success: false,
        error: "获取统计信息失败",
      },
      { status: 500 }
    );
  }
}
