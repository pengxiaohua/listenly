import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAdminAuth } from "@/lib/auth";
import { createOssClient } from '@/lib/oss';

export const GET = withAdminAuth(async (req: Request) => {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    const skip = (page - 1) * pageSize;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = today.toISOString();

    const [users, totalCount, todayCount] = await Promise.all([
      prisma.user.findMany({
        select: {
          id: true,
          userName: true,
          avatar: true,
          phone: true,
          deviceOS: true,
          location: true,
          wechatOpenId: true,
          isAdmin: true,
          createdAt: true,
          lastLogin: true,
        },
        skip,
        take: pageSize,
        orderBy: {
          lastLogin: 'desc'
        }
      }),
      prisma.user.count(),
      prisma.user.count({
        where: {
          createdAt: {
            gte: todayStart
          }
        }
      })
    ]);

    const client = createOssClient();
    const processedUsers = await Promise.all(
      users.map(async (user: typeof users[0]) => {
        let avatarUrl = user.avatar;

        if (user.avatar) {
          if (user.avatar.startsWith('avatars/')) {
            // 新格式：OSS key，需要生成签名URL
            try {
              avatarUrl = client.signatureUrl(user.avatar, {
                expires: parseInt(process.env.OSS_EXPIRES || '3600', 10),
              });
            } catch (error) {
              console.error('生成头像签名URL失败:', error);
            }
          } else if (user.avatar.includes('listenly.oss-cn-hangzhou.aliyuncs.com/avatars/')) {
            // 兼容旧格式：完整URL，提取OSS key并生成签名URL
            try {
              const urlParts = user.avatar.split('listenly.oss-cn-hangzhou.aliyuncs.com/');
              if (urlParts.length > 1) {
                const ossKey = urlParts[1].split('?')[0]; // 移除可能的查询参数
                avatarUrl = client.signatureUrl(ossKey, {
                  expires: parseInt(process.env.OSS_EXPIRES || '3600', 10),
                });
              }
            } catch (error) {
              console.error('处理旧格式头像URL失败:', error);
            }
          }
          // 其他格式（如微信头像）保持不变
        }

        return {
          ...user,
          avatar: avatarUrl,
          createdAt: user.createdAt.toISOString(),
          lastLogin: user.lastLogin.toISOString(),
        };
      })
    );

    const totalPages = Math.ceil(totalCount / pageSize);

    return NextResponse.json({
      users: processedUsers,
      pagination: {
        page,
        pageSize,
        total: totalCount,
        totalPages,
      },
      todayCount,
    });
  } catch (error) {
    console.error("获取用户列表失败:", error);
    return NextResponse.json({ error: "获取用户列表失败" }, { status: 500 });
  }
});
