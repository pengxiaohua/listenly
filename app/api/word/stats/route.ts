import { NextResponse } from "next/server";
import { prisma } from '@/lib/prisma'


export async function GET(request: Request) {
  const userId = request.headers.get('x-user-id');
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");

    if (!category) {
      return NextResponse.json({ error: "缺少分类参数" }, { status: 400 });
    }

    // 获取该分类的总单词数
    const totalCount = await prisma.word.count({
      where: { category },
    });

    // 获取用户在该分类中已完成的单词数
    const completedCount = await prisma.wordRecord.count({
      where: {
        userId: userId ?? '',
        isCorrect: true,
        word: {
          category: category,
        },
      },
    });

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
