import { NextResponse } from "next/server";
import { prisma } from '@/lib/prisma'

// 获取反馈未读数量（轻量级接口，只返回数量）
export async function GET(req: Request) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ code: 401, success: false, message: "未登录" }, { status: 401 });
    }

    // 统计有回复但未读的反馈数量
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const unreadCount = await (prisma.feedback.count as any)({
      where: {
        userId,
        reply: { not: null },
        isRead: false
      }
    });

    return NextResponse.json({
      code: 200,
      success: true,
      unreadCount
    });
  } catch (error) {
    console.error("获取未读数量失败:", error);
    return NextResponse.json({
      code: 500,
      success: false,
      message: "服务器错误",
      unreadCount: 0
    }, { status: 500 });
  }
}
