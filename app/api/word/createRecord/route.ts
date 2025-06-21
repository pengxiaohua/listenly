import { NextResponse } from "next/server";
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const userId = request.headers.get('x-user-id');
    const { wordId, isCorrect, errorCount } = await request.json();

    // 验证必要参数
    if (!wordId) {
      return NextResponse.json(
        {
          success: false,
          error: "缺少单词ID",
        },
        { status: 400 }
      );
    }

    // 验证单词是否存在
    const word = await prisma.word.findUnique({
      where: { id: wordId },
    });

    if (!word) {
      return NextResponse.json(
        {
          success: false,
          error: "单词不存在",
        },
        { status: 404 }
      );
    }

    await prisma.user.upsert({
      where: { id: userId ?? '' },
      update: {},
      create: { id: userId ?? '' },
    });

    // 更新或创建单词记录
    const record = await prisma.wordRecord.upsert({
      where: {
        userId_wordId: {
          userId: userId ?? '',
          wordId: wordId,
        },
      },
      update: {
        isCorrect,
        errorCount: {
          increment: errorCount,
        },
        lastAttempt: new Date(),
      },
      create: {
        userId: userId ?? '',
        wordId: wordId,
        isCorrect,
        errorCount,
        lastAttempt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: record.id,
        wordId: record.wordId,
        isCorrect: record.isCorrect,
        errorCount: record.errorCount,
        lastAttempt: record.lastAttempt,
      },
    });
  } catch (error) {
    console.error("记录单词拼写结果失败:", error);
    return NextResponse.json(
      {
        success: false,
        error: "记录单词拼写结果失败",
        details: error instanceof Error ? error.message : "未知错误",
      },
      { status: 500 }
    );
  }
}
