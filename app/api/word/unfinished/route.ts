import { NextResponse } from "next/server";
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const userId = request.headers.get('x-user-id');
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    if (!category) {
      return NextResponse.json({ error: "缺少分类参数" }, { status: 400 });
    }

    // 获取该分类下用户尚未正确拼写的单词，支持分页
    const words = await prisma.word.findMany({
      where: {
        category,
        OR: [
          {
            // 没有记录的单词
            records: {
              none: {
                userId: userId ?? '',
              },
            },
          },
          {
            // 有记录但未正确拼写的单词
            records: {
              some: {
                userId: userId ?? '',
                isCorrect: false,
              },
            },
          },
        ],
      },
      select: {
        id: true,
        word: true,
        phoneticUS: true,
        phoneticUK: true,
        definition: true,
        translation: true,
        exchange: true,
        category: true,
      },
      take: limit,
      skip: offset,
      // 随机排序，确保每次获取的单词不同
      orderBy: {
        id: 'asc' // 可以考虑使用随机排序，但这会影响性能
      }
    });

    // 获取总数用于前端判断是否还有更多数据
    const total = await prisma.word.count({
      where: {
        category,
        OR: [
          {
            records: {
              none: {
                userId: userId ?? '',
              },
            },
          },
          {
            records: {
              some: {
                userId: userId ?? '',
                isCorrect: false,
              },
            },
          },
        ],
      },
    });

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
