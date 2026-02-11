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

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: "未登录",
        },
        { status: 401 }
      );
    }

    // 每次正确拼写都创建新记录，错误时尝试更新 30 分钟内的活跃记录
    if (isCorrect) {
      const record = await prisma.wordRecord.create({
        data: {
          userId: userId,
          wordId: wordId,
          isCorrect: true,
          errorCount: Number(errorCount) || 0,
          lastAttempt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        data: record,
      });
    } else {
      // 查找最近 30 分钟内且未完成的记录
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      const existingRecord = await prisma.wordRecord.findFirst({
        where: {
          userId: userId,
          wordId: wordId,
          isCorrect: false,
          archived: false,
          createdAt: {
            gt: thirtyMinutesAgo,
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (existingRecord) {
        const record = await prisma.wordRecord.update({
          where: { id: existingRecord.id },
          data: {
            errorCount: {
              increment: 1,
            },
            isMastered: false, // 重置掌握状态，确保已掌握的单词再次出错时能重新进入错词本
            lastAttempt: new Date(),
          },
        });
        return NextResponse.json({ success: true, data: record });
      } else {
        const record = await prisma.wordRecord.create({
          data: {
            userId: userId,
            wordId: wordId,
            isCorrect: false,
            errorCount: 1,
            lastAttempt: new Date(),
          },
        });
        return NextResponse.json({ success: true, data: record });
      }
    }
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
