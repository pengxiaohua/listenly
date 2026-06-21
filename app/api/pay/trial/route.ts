import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { recomputeMembershipExpiry } from '@/lib/membership'

export async function POST(request: NextRequest) {
  const userId = request.cookies.get('userId')?.value
  if (!userId) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) {
    return NextResponse.json({ error: '用户不存在' }, { status: 404 })
  }

  // 被邀请人（通过邀请链接注册并获得奖励）不再享有试用资格
  if (user.invitedById) {
    return NextResponse.json(
      { error: '通过邀请获得会员的用户不可领取试用' },
      { status: 409 }
    )
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
    await recomputeMembershipExpiry(tx, userId)
  })

  return NextResponse.json({ success: true })
}
