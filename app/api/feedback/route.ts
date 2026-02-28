import { NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/auth";
import { prisma } from '@/lib/prisma'
import { createOssClient } from '@/lib/oss'

function signUrl(ossKey: string | null | undefined): string | null {
  if (!ossKey) return null;
  if (ossKey.startsWith('http')) return ossKey;
  try {
    const ossClient = createOssClient()
    return ossClient.signatureUrl(ossKey, { expires: 3600 });
  } catch (e) {
    console.error("签名失败:", e);
    return ossKey;
  }
}

// 定义包含可选字段的 Feedback 类型（兼容旧数据，字段可能不存在）
interface FeedbackWithUser {
  id: string;
  userId: string;
  title: string;
  content: string;
  createdAt: Date;
  user: {
    userName: string;
    avatar: string;
  } | null;
  // 以下字段可能不存在（旧数据兼容）
  type?: string | null;
  imageUrl?: string | null;
  reply?: string | null;
  replyAt?: Date | null;
  isRead?: boolean | null;
}

// 获取反馈列表 (管理员查看所有，普通用户查看自己)
export async function GET(req: Request) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ code: 401, success: false, message: "未登录" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { isAdmin: true } });
    const isAdmin = user?.isAdmin || false;

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const skip = (page - 1) * pageSize;

    // 如果传入了 mine=true 参数，强制只获取当前用户的反馈（用于【我的反馈】页面）
    const mineOnly = searchParams.get('mine') === 'true';

    // 如果不是管理员，或者明确要求只看自己的，只能看自己的
    const where = (isAdmin && !mineOnly) ? {} : { userId };

    const total = await prisma.feedback.count({ where });

    // 使用类型断言，因为 Prisma Client 可能还未重新生成包含新字段的类型
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const feedbacks = await (prisma.feedback.findMany as any)({
      where,
      skip,
      take: pageSize,
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        user: {
          select: {
            userName: true,
            avatar: true
          }
        }
      }
    }) as FeedbackWithUser[];

    // 处理图片URL，兼容旧数据（可能没有 type、imageUrl、reply 等字段）
    const data = feedbacks.map((f) => {
      try {
        // 将 f 断言为包含可选字段的类型，安全地访问可能不存在的字段
        const feedback = f as unknown as FeedbackWithUser;

        const type = feedback.type ?? 'bug';
        const imageUrl = feedback.imageUrl ?? null;
        const reply = feedback.reply ?? null;
        const replyAt = feedback.replyAt ?? null;
        const isRead = feedback.isRead ?? false;

        return {
          id: feedback.id,
          userId: feedback.userId,
          user: feedback.user || null, // 兼容可能没有关联的情况
          title: feedback.title || '',
          content: feedback.content || '',
          type,
          imageUrl: signUrl(imageUrl),
          reply,
          replyAt,
          isRead,
          createdAt: feedback.createdAt
        };
      } catch (e) {
        console.error('处理反馈数据失败:', f.id, e);
        // 返回基本数据，确保不会导致整个请求失败
        const feedback = f as unknown as FeedbackWithUser;
        return {
          id: feedback.id,
          userId: feedback.userId,
          user: null,
          title: feedback.title || '',
          content: feedback.content || '',
          type: 'bug',
          imageUrl: null,
          reply: null,
          replyAt: null,
          isRead: false,
          createdAt: feedback.createdAt
        };
      }
    });

    // 如果是查看自己的反馈（mine=true），计算未读数量
    let unreadCount = 0;
    if (mineOnly) {
      // 统计有回复但未读的反馈数量
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      unreadCount = await (prisma.feedback.count as any)({
        where: {
          userId,
          reply: { not: null },
          isRead: false
        }
      });
    }

    const totalPages = Math.ceil(total / pageSize);

    return NextResponse.json({
      code: 200,
      success: true,
      data,
      unreadCount: mineOnly ? unreadCount : undefined, // 只在查看自己反馈时返回未读数量
      pagination: {
        page,
        pageSize,
        total,
        totalPages
      }
    });
  } catch (error) {
    console.error("获取反馈列表失败:", error);
    // 输出详细错误信息以便调试
    if (error instanceof Error) {
      console.error("错误详情:", error.message);
      console.error("错误堆栈:", error.stack);
    }
    return NextResponse.json({
      code: 500,
      success: false,
      message: "服务器错误",
      error: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
    }, { status: 500 });
  }
}

// 删除反馈 (管理员)
export const DELETE = withAdminAuth(async (req: Request) => {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ code: 400, success: false, message: "缺少反馈ID" }, { status: 400 });
    }

    await prisma.feedback.delete({
      where: { id }
    });

    return NextResponse.json({
      code: 200,
      success: true,
      message: "删除成功"
    });
  } catch (error) {
    console.error("删除反馈失败:", error);
    return NextResponse.json({ code: 500, success: false, message: "服务器错误" }, { status: 500 });
  }
});

// 标记反馈为已读（用户点击已回复的反馈时调用）
export async function PATCH(req: Request) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ code: 401, success: false, message: "未登录" }, { status: 401 });
    }

    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ code: 400, success: false, message: "缺少反馈ID" }, { status: 400 });
    }

    // 验证反馈属于当前用户
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const feedback = await (prisma.feedback.findUnique as any)({
      where: { id },
      select: { userId: true, reply: true }
    }) as { userId: string; reply: string | null } | null;

    if (!feedback) {
      return NextResponse.json({ code: 404, success: false, message: "反馈不存在" }, { status: 404 });
    }

    if (feedback.userId !== userId) {
      return NextResponse.json({ code: 403, success: false, message: "无权限" }, { status: 403 });
    }

    // 只有有回复的反馈才能标记为已读
    if (!feedback.reply) {
      return NextResponse.json({ code: 400, success: false, message: "该反馈尚未有回复" }, { status: 400 });
    }

    // 更新 isRead 字段
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma.feedback.update as any)({
      where: { id },
      data: { isRead: true } as { isRead: boolean }
    });

    return NextResponse.json({
      code: 200,
      success: true,
      message: "已标记为已读"
    });
  } catch (error) {
    console.error("标记已读失败:", error);
    return NextResponse.json({ code: 500, success: false, message: "服务器错误" }, { status: 500 });
  }
}

// 回复反馈 (管理员)
export async function PUT(req: Request) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ code: 401, success: false, message: "未登录" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { isAdmin: true } });
    if (!user?.isAdmin) {
      return NextResponse.json({ code: 403, success: false, message: "无权限" }, { status: 403 });
    }

    const { id, reply } = await req.json();
    if (!id || !reply) {
      return NextResponse.json({ code: 400, success: false, message: "缺少参数" }, { status: 400 });
    }

    // 管理员回复时，将 isRead 设置为 false（新回复需要用户查看）
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma.feedback.update as any)({
      where: { id },
      data: {
        reply: reply as string,
        replyAt: new Date(),
        isRead: false // 新回复标记为未读
      } as { reply: string; replyAt: Date; isRead: boolean }
    });

    return NextResponse.json({
      code: 200,
      success: true,
      message: "回复成功"
    });
  } catch (error) {
    console.error("回复反馈失败:", error);
    return NextResponse.json({ code: 500, success: false, message: "服务器错误" }, { status: 500 });
  }
}

// 提交反馈
export async function POST(req: Request) {
  try {
    const userId = req.headers.get('x-user-id');
    const { title, content, type = 'bug', imageUrl } = await req.json();

    if (!userId) {
      return NextResponse.json({ code: 400, success: false, message: "未登录" }, { status: 401 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 查询用户当天的反馈次数
    const feedbackCount = await prisma.feedback.count({
      where: { userId, createdAt: { gte: today } },
    });

    if (feedbackCount >= 5) { // 稍微放宽一点限制，或者保持2
      return NextResponse.json({ code: 429, success: false, message: "每天最多提交 5 次反馈" }, { status: 429 });
    }

    // 存储反馈，兼容旧数据格式
    const newFeedback = await prisma.feedback.create({
      data: {
        userId,
        title,
        content,
        type: (type || 'bug') as string, // 确保有默认值
        imageUrl: (imageUrl || null) as string | null
      } as {
        userId: string;
        title: string;
        content: string;
        type: string;
        imageUrl: string | null;
      }
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
