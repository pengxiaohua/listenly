import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAdminAuth } from '@/lib/auth'
import { recomputeMembershipExpiry } from '@/lib/membership'

// 后台可赠送的套餐（不含试用 / 邀请奖励）
const giftablePlans: Record<string, number> = {
  monthly: 30,
  quarterly: 90,
  yearly: 365,
}

export const POST = withAdminAuth(async (req: NextRequest) => {
  try {
    const { userId, plan } = await req.json()

    if (!userId || !plan || !giftablePlans[plan]) {
      return NextResponse.json({ error: '参数不完整' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma as any).$transaction(async (tx: any) => {
      // 创建赠送订单（金额为0，状态直接为paid）
      const outTradeNo = `GIFT-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      await tx.order.create({
        data: {
          outTradeNo,
          userId,
          plan,
          amount: 0,
          status: 'paid',
          transactionId: 'ADMIN_GIFT',
        },
      })

      // 基于所有已支付订单重新计算会员到期时间（和 notify 逻辑一致）
      await recomputeMembershipExpiry(tx, userId)
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('赠送会员失败:', error)
    return NextResponse.json({ error: '赠送失败' }, { status: 500 })
  }
})
