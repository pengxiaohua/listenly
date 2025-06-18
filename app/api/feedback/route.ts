import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const userId = req.headers.get('x-user-id');
    const { title, content } = await req.json();

    if (!userId) {
      return NextResponse.json({ code: 400, success: false, message: "未登录" }, { status: 401 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 查询用户当天的反馈次数
    const feedbackCount = await prisma.feedback.count({
      where: { userId, createdAt: { gte: today } },
    });

    if (feedbackCount >= 2) {
      return NextResponse.json({ code: 429, success: false, message: "每天最多提交 2 次反馈" }, { status: 429 });
    }

    // 存储反馈
    const newFeedback = await prisma.feedback.create({
      data: { userId, title, content },
    });

    return NextResponse.json({
      code: 200,
      success: true,
      message: "反馈提交成功",
      data: { id: newFeedback.id, createdAt: newFeedback.createdAt },
    });
  } catch (error) {
    console.error("反馈提交失败:", error);
    return NextResponse.json({ code: 500, success: false, message: "服务器错误" }, { status: 500 });
  }
}
