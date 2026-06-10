import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { createOssClient } from '@/lib/oss'
import { isPro } from '@/lib/membership'

export async function GET() {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("userId")?.value;

    if (!userId) {
      return new NextResponse(null, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return new NextResponse(null, { status: 404 });
    }

    // 处理头像URL
    const client = createOssClient()
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

    // 计算当前生效的会员类型，并判断是否已享受过任何会员功能（用于隐藏"试用会员"入口）
    let memberPlan = 'free'
    const paidOrders = await prisma.order.findMany({
      where: { userId, status: 'paid' },
      orderBy: { createdAt: 'asc' },
      select: { plan: true, createdAt: true },
    })

    if (isPro(user.membershipExpiresAt)) {
      const planDaysMap: Record<string, number> = { trial: 3, test: 1, monthly: 30, quarterly: 90, yearly: 365 }
      const now = Date.now()
      let cursor = 0
      for (const o of paidOrders) {
        const days = planDaysMap[o.plan] ?? 30
        const oTime = new Date(o.createdAt).getTime()
        const start = cursor > oTime ? cursor : oTime
        const end = start + days * 86400000
        cursor = end
        if (now >= start && now < end) {
          memberPlan = o.plan
          break
        }
      }
    }

    // 剔除敏感字段（密码哈希），并补充账号密码相关的安全信息
    const { passwordHash, ...safeUser } = user;

    return NextResponse.json({
      ...safeUser,
      avatar: avatarUrl,
      isPro: isPro(user.membershipExpiresAt),
      memberPlan,
      // 是否已设置账号密码
      hasPassword: !!passwordHash,
      // 是否已享受过任何会员功能（试用 / 购买 / 赠送），与 /api/pay/trial 中的 409 拒绝逻辑保持一致
      hasUsedTrial: paidOrders.length > 0,
    });
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
        isAdmin: true,
      },
    });

    // 处理头像URL
    const client = createOssClient()
    let avatarUrl = updatedUser.avatar;
    if (updatedUser.avatar) {
      if (updatedUser.avatar.startsWith('avatars/')) {
        // 新格式：OSS key，需要生成签名URL
        try {
          avatarUrl = client.signatureUrl(updatedUser.avatar, {
            expires: parseInt(process.env.OSS_EXPIRES || '3600', 10),
          });
        } catch (error) {
          console.error('生成头像签名URL失败:', error);
        }
      } else if (updatedUser.avatar.includes('listenly.oss-cn-hangzhou.aliyuncs.com/avatars/')) {
        // 兼容旧格式：完整URL，提取OSS key并生成签名URL
        try {
          const urlParts = updatedUser.avatar.split('listenly.oss-cn-hangzhou.aliyuncs.com/');
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

    return NextResponse.json({
      ...updatedUser,
      avatar: avatarUrl,
    });
  } catch (error) {
    console.error("更新用户信息失败:", error);
    return new NextResponse(null, { status: 500 });
  }
}
