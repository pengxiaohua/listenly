import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { userId, adminKey } = await req.json();

    // 验证管理员密钥
    if (!adminKey || adminKey !== process.env.ADMIN_SECRET_KEY) {
      return new NextResponse(null, {
        status: 403,
        statusText: "Invalid admin key"
      });
    }

    if (!userId) {
      return new NextResponse(null, {
        status: 400,
        statusText: "User ID is required"
      });
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

    return NextResponse.json(user);
  } catch (error) {
    console.error("设置管理员权限失败:", error);
    return new NextResponse(null, { status: 500 });
  }
}