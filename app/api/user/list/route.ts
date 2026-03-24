import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAdminAuth } from "@/lib/auth";
import { createOssClient } from '@/lib/oss';

export const GET = withAdminAuth(async (req: Request) => {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const search = searchParams.get('search')?.trim() || '';

    const skip = (page - 1) * pageSize;

    const where = search
      ? { userName: { contains: search } }
      : {};

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = today.toISOString();

    const [users, totalCount, todayCount] = await Promise.all([
      prisma.user.findMany({
        where,
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
      prisma.user.count({ where }),
      prisma.user.count({
        where: {
          createdAt: {
            gte: todayStart
          }
        }
      })
    ]);;

    // 计算每个用户当前生效的会员类型
    const userIds = users.map(u => u.id);
    const paidOrders = userIds.length
      ? await prisma.order.findMany({
          where: { userId: { in: userIds }, status: 'paid' },
          orderBy: { createdAt: 'asc' },
          select: { userId: true, plan: true, createdAt: true },
        })
      : [];

    const planDaysMap: Record<string, number> = { test: 1, monthly: 30, quarterly: 90, yearly: 365 };
    const userMemberPlan = new Map<string, string>();
    const ordersByUser = new Map<string, typeof paidOrders>();
    paidOrders.forEach(o => {
      if (!ordersByUser.has(o.userId)) ordersByUser.set(o.userId, []);
      ordersByUser.get(o.userId)!.push(o);
    });
    const now = Date.now();
    ordersByUser.forEach((userOrders, uid) => {
      let cursor = 0;
      for (const o of userOrders) {
        const days = planDaysMap[o.plan] ?? 30;
        const oTime = new Date(o.createdAt).getTime();
        const s = cursor > oTime ? cursor : oTime;
        const e = s + days * 86400000;
        cursor = e;
        if (now >= s && now < e) {
          userMemberPlan.set(uid, o.plan);
          break;
        }
      }
    });

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
          memberPlan: userMemberPlan.get(user.id) || 'free',
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
