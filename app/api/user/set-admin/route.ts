import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// 标记这个路由不需要认证中间件检查
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// 添加配置以跳过认证中间件
export const config = {
  api: {
    auth: false,
  },
};

export async function POST(req: Request) {
  try {
    const { userId, adminKey } = await req.json();

    console.log('收到设置管理员请求:', { userId, adminKeyLength: adminKey?.length });
    console.log('环境变量 ADMIN_SECRET_KEY 是否存在:', !!process.env.ADMIN_SECRET_KEY);

    // 验证管理员密钥
    if (!adminKey) {
      return NextResponse.json({
        error: "Admin key is required",
        success: false
      }, { status: 403 });
    }

    if (adminKey !== process.env.ADMIN_SECRET_KEY) {
      return NextResponse.json({
        error: "Invalid admin key",
        success: false
      }, { status: 403 });
    }

    if (!userId) {
      return NextResponse.json({
        error: "User ID is required",
        success: false
      }, { status: 400 });
    }

    // 检查用户是否存在
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      return NextResponse.json({
        error: "User not found",
        success: false
      }, { status: 404 });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { isAdmin: true },
      select: {
        id: true,
        userName: true,
        isAdmin: true,
      },
    });

    console.log('成功更新用户管理员状态:', user);

    return NextResponse.json({
      data: user,
      success: true
    });
  } catch (error) {
    console.error("设置管理员权限失败:", error);
    return NextResponse.json({
      error: "Internal server error",
      success: false,
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}