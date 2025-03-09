import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(
  request: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const userId = params.userId;

    // 获取用户的所有单词记录
    const records = await prisma.wordRecord.findMany({
      where: {
        userId: userId,
      },
      include: {
        word: {
          select: {
            id: true,
            word: true,
            phoneticUS: true,
            phoneticUK: true,
            translation: true,
            category: true,
          },
        },
      },
      orderBy: {
        lastAttempt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      records,
    });
  } catch (error) {
    console.error("获取用户记录失败:", error);
    return NextResponse.json(
      {
        success: false,
        error: "获取用户记录失败",
      },
      { status: 500 }
    );
  }
}
