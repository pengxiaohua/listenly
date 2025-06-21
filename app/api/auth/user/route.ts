import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const userId = cookies().get("userId")?.value;

    if (!userId) {
      return new NextResponse(null, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        userName: true,
        avatar: true,
      },
    });

    if (!user) {
      return new NextResponse(null, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("获取用户信息失败:", error);
    return new NextResponse(null, { status: 500 });
  }
}
