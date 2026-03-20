import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

export async function GET() {
  const cookieStore = await cookies();
  const userId = cookieStore.get('userId')?.value;
  if (!userId) return new NextResponse(null, { status: 401 });

  const orders = await prisma.order.findMany({
    where: { userId, status: 'paid' },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      outTradeNo: true,
      plan: true,
      amount: true,
      status: true,
      createdAt: true,
    },
  });

  // 计算每个订单的会员有效期区间
  const planDays: Record<string, number> = {
    test: 1, monthly: 30, quarterly: 90, yearly: 365,
  };

  let cursor = new Date(0); // 追踪累计到期时间
  const ordersWithPeriod = orders.map((order) => {
    const days = planDays[order.plan] ?? 30;
    const orderDate = new Date(order.createdAt);
    // 起始日 = max(上一个到期日, 订单创建日)
    const start = cursor > orderDate ? new Date(cursor) : orderDate;
    const end = new Date(start.getTime() + days * 86400000);
    cursor = end;
    return { ...order, periodStart: start.toISOString(), periodEnd: end.toISOString() };
  });

  // 返回时按时间倒序
  ordersWithPeriod.reverse();
  return NextResponse.json(ordersWithPeriod);
}
