import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const TRIAL_DAYS = 3

export async function POST(request: NextRequest) {
  const userId = request.cookies.get('userId')?.value
  if (!userId) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) {
    return NextResponse.json({ error: '用户不存在' }, { status: 404 })
  }

  // 检查是否有任何已支付订单（购买/赠送/试用都算）
  const paidOrderCount = await prisma.order.count({
    where: { userId, status: 'paid' },
  })

  if (paidOrderCount > 0) {
    return NextResponse.json(
      { error: '已享受过会员功能，请购买会员后使用' },
      { status: 409 }
    )
  }

  // 创建试用订单并更新会员到期时间
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (prisma as any).$transaction(async (tx: any) => {
    const outTradeNo = `TRIAL-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    await tx.order.create({
      data: {
        outTradeNo,
        userId,
        plan: 'trial',
        amount: 0,
        status: 'paid',
        transactionId: 'TRIAL',
      },
    })

    // 基于所有已支付订单重新计算会员到期时间（与 notify/gift 逻辑一致）
    const planDays: Record<string, number> = {
      trial: TRIAL_DAYS,
      test: 1,
      monthly: 30,
      quarterly: 90,
      yearly: 365,
    }

    const allPaidOrders = await tx.order.findMany({
      where: { userId, status: 'paid' },
      orderBy: { createdAt: 'asc' },
      select: { plan: true, createdAt: true },
    })

    let cursor = 0
    for (const o of allPaidOrders) {
      const days = planDays[o.plan] ?? 30
      const oTime = new Date(o.createdAt).getTime()
      const start = cursor > oTime ? cursor : oTime
      cursor = start + days * 24 * 60 * 60 * 1000
    }

    await tx.user.update({
      where: { id: userId },
      data: { membershipExpiresAt: new Date(cursor) },
    })
  })

  return NextResponse.json({ success: true })
}
