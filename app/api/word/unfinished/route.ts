import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const userId = request.headers.get('x-user-id');
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");

    if (!category) {
      return NextResponse.json({ error: "缺少分类参数" }, { status: 400 });
    }

    // 获取该分类下用户尚未正确拼写的单词
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
    });

    return NextResponse.json({ words });
  } catch (error) {
    console.error("获取单词失败:", error);
    return NextResponse.json({ error: "获取单词失败" }, { status: 500 });
  }
}
