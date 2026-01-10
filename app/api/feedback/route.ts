import { NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/auth";
import { prisma } from '@/lib/prisma'
import OSS from 'ali-oss'

const ossClient = new OSS({
  region: process.env.OSS_REGION!,
  accessKeyId: process.env.OSS_ACCESS_KEY_ID!,
  accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET!,
  bucket: process.env.OSS_BUCKET_NAME!,
  secure: true,
})

function signUrl(ossKey: string) {
  if (!ossKey) return null;
  if (ossKey.startsWith('http')) return ossKey;
  try {
    return ossClient.signatureUrl(ossKey, { expires: 3600 });
  } catch (e) {
    console.error("签名失败:", e);
    return ossKey;
  }
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

    // 如果不是管理员，只能看自己的
    const where = isAdmin ? {} : { userId };

    const total = await prisma.feedback.count({ where });

    const feedbacks = await prisma.feedback.findMany({
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
    });

    // 处理图片URL
    const data = feedbacks.map(f => ({
      ...f,
      imageUrl: f.imageUrl ? signUrl(f.imageUrl) : null
    }));

    const totalPages = Math.ceil(total / pageSize);

    return NextResponse.json({
      code: 200,
      success: true,
      data,
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

    await prisma.feedback.update({
      where: { id },
      data: {
        reply,
        replyAt: new Date()
      }
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

    // 存储反馈
    const newFeedback = await prisma.feedback.create({
      data: { 
        userId, 
        title, 
        content,
        type,
        imageUrl
      },
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
