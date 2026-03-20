import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const outTradeNo = request.nextUrl.searchParams.get('outTradeNo');
  if (!outTradeNo) {
    return NextResponse.json({ error: '缺少订单号' }, { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { outTradeNo },
    select: { status: true },
  });

  if (!order) {
    return NextResponse.json({ error: '订单不存在' }, { status: 404 });
  }

  return NextResponse.json({ status: order.status });
}
