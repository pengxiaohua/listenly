import { NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/auth";
import { prisma } from '@/lib/prisma'

// 获取反馈列表 (管理员)
export const GET = withAdminAuth(async (req: Request) => {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const skip = (page - 1) * pageSize;

    // 获取反馈总数
    const total = await prisma.feedback.count();

    // 获取反馈列表
    const feedbacks = await prisma.feedback.findMany({
      skip,
      take: pageSize,
      orderBy: {
        createdAt: 'desc'
      }
    });

    const totalPages = Math.ceil(total / pageSize);

    return NextResponse.json({
      code: 200,
      success: true,
      data: feedbacks,
      pagination: {
        page,
        pageSize,
        total,
        totalPages
      }
    });
  } catch (error) {
    console.error("获取反馈列表失败:", error);
    return NextResponse.json({ code: 500, success: false, message: "服务器错误" }, { status: 500 });
  }
});

// 提交反馈
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
