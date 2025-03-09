import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const FIXED_USER_ID = "hua"; // 固定用户ID

export async function POST(request: Request) {
  try {
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

    // TODO:确保固定用户存在
    await prisma.user.upsert({
      where: { id: FIXED_USER_ID },
      update: {},
      create: { id: FIXED_USER_ID },
    });

    // 更新或创建单词记录
    const record = await prisma.wordRecord.upsert({
      where: {
        userId_wordId: {
          userId: FIXED_USER_ID,
          wordId: wordId,
        },
      },
      update: {
        isCorrect,
        errorCount: {
          increment: errorCount || 0,
        },
        lastAttempt: new Date(),
      },
      create: {
        userId: FIXED_USER_ID,
        wordId: wordId,
        isCorrect,
        errorCount: errorCount || 0,
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
