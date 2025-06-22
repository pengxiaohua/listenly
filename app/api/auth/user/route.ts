import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("userId")?.value;

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

export async function PUT(req: Request) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("userId")?.value;

    if (!userId) {
      return new NextResponse(null, { status: 401 });
    }

    const { userName, avatar } = await req.json();

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        userName,
        avatar,
      },
      select: {
        id: true,
        userName: true,
        avatar: true,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("更新用户信息失败:", error);
    return new NextResponse(null, { status: 500 });
  }
}
