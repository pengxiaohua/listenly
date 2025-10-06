import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAdminAuth } from "@/lib/auth";

// 更新用户信息（管理员）
export const PUT = withAdminAuth(async (req: Request) => {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('id');
    const { isAdmin } = await req.json();

    if (!userId) {
      return NextResponse.json({
        code: 400,
        success: false,
        message: "缺少用户ID"
      }, { status: 400 });
    }

    // 不能修改自己的管理员状态
    const currentUserId = req.headers.get('x-user-id');
    if (currentUserId === userId && isAdmin === false) {
      return NextResponse.json({
        code: 400,
        success: false,
        message: "不能取消自己的管理员权限"
      }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { isAdmin },
      select: {
        id: true,
        userName: true,
        isAdmin: true,
      },
    });

    return NextResponse.json({
      code: 200,
      success: true,
      message: "更新成功",
      data: user
    });
  } catch (error) {
    console.error("更新用户信息失败:", error);
    return NextResponse.json({
      code: 500,
      success: false,
      message: "服务器错误"
    }, { status: 500 });
  }
});

// 删除用户（管理员）
export const DELETE = withAdminAuth(async (req: Request) => {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('id');

    if (!userId) {
      return NextResponse.json({
        code: 400,
        success: false,
        message: "缺少用户ID"
      }, { status: 400 });
    }

    // 不能删除自己
    const currentUserId = req.headers.get('x-user-id');
    if (currentUserId === userId) {
      return NextResponse.json({
        code: 400,
        success: false,
        message: "不能删除自己"
      }, { status: 400 });
    }

    // 检查用户是否存在
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({
        code: 404,
        success: false,
        message: "用户不存在"
      }, { status: 404 });
    }

    // 删除用户（会级联删除相关记录）
    await prisma.user.delete({
      where: { id: userId },
    });

    return NextResponse.json({
      code: 200,
      success: true,
      message: "删除成功"
    });
  } catch (error) {
    console.error("删除用户失败:", error);
    return NextResponse.json({
      code: 500,
      success: false,
      message: "服务器错误"
    }, { status: 500 });
  }
});

