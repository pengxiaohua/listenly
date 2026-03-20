import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAdminAuth } from '@/lib/auth';
import { createOssClient } from '@/lib/oss';

export const GET = withAdminAuth(async (req: Request) => {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const skip = (page - 1) * pageSize;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, userName: true, avatar: true } },
        },
      }),
      prisma.order.count(),
    ]);

    const client = createOssClient();
    const result = orders.map(o => {
      let avatarUrl = o.user.avatar;
      if (avatarUrl?.startsWith('avatars/')) {
        try {
          avatarUrl = client.signatureUrl(avatarUrl, {
            expires: parseInt(process.env.OSS_EXPIRES || '3600', 10),
          });
        } catch { /* ignore */ }
      }
      return {
        id: o.id,
        outTradeNo: o.outTradeNo,
        plan: o.plan,
        amount: o.amount,
        status: o.status,
        transactionId: o.transactionId,
        createdAt: o.createdAt.toISOString(),
        updatedAt: o.updatedAt.toISOString(),
        userId: o.user.id,
        userName: o.user.userName,
        avatar: avatarUrl,
      };
    });

    return NextResponse.json({ orders: result, total });
  } catch (error) {
    console.error('获取订单列表失败:', error);
    return NextResponse.json({ error: '获取订单列表失败' }, { status: 500 });
  }
});
