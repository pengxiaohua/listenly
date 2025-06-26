import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    // 管理员模式：获取所有用户信息
    const skip = (page - 1) * pageSize;

    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        select: {
          id: true,
          userName: true,
          avatar: true,
          phone: true,
          wechatOpenId: true,
          createdAt: true,
          lastLogin: true,
        },
        skip,
        take: pageSize,
        orderBy: {
          lastLogin: 'desc'
        }
      }),
      prisma.user.count()
    ]);

    return NextResponse.json({
      users,
      pagination: {
        page,
        pageSize,
        totalPages: Math.ceil(totalCount / pageSize),
        total: totalCount
      }
    });
  } catch (error) {
    console.error("获取用户列表失败:", error);
    return new NextResponse(null, { status: 500 });
  }
}
