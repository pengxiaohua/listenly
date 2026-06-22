import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { isPro, isFormalPlan, PLAN_DAYS } from '@/lib/membership'

// 视听演练「跟读」每日次数限制：
// - 任意会员（含试用会员）：每天 20 次
// - 正式会员（月/季/年）：每天 200 次
// - 非会员：按基础额度 20 次
const MEMBER_DAILY_LIMIT = 20
const FORMAL_DAILY_LIMIT = 200

export async function GET() {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('userId')?.value

    if (!userId) {
      return NextResponse.json({ dailyLimit: MEMBER_DAILY_LIMIT, isPro: false, isFormal: false })
    }

    const user = (await prisma.user.findUnique({
      where: { id: userId },
    })) as { membershipExpiresAt?: Date | null } | null

    const userIsPro = isPro(user?.membershipExpiresAt)

    // 计算当前生效的会员套餐，判断是否为「正式会员」
    let isFormal = false
    if (userIsPro) {
      const paidOrders = await prisma.order.findMany({
        where: { userId, status: 'paid' },
        orderBy: { createdAt: 'asc' },
        select: { plan: true, createdAt: true },
      })
      const now = Date.now()
      let cursor = 0
      for (const o of paidOrders) {
        const days = PLAN_DAYS[o.plan] ?? 30
        const oTime = new Date(o.createdAt).getTime()
        const start = cursor > oTime ? cursor : oTime
        const end = start + days * 86400000
        cursor = end
        if (now >= start && now < end) {
          isFormal = isFormalPlan(o.plan)
          break
        }
      }
    }

    const dailyLimit = isFormal ? FORMAL_DAILY_LIMIT : MEMBER_DAILY_LIMIT

    return NextResponse.json({ dailyLimit, isPro: userIsPro, isFormal })
  } catch (error) {
    console.error('获取跟读每日限额失败:', error)
    return NextResponse.json({ dailyLimit: MEMBER_DAILY_LIMIT, isPro: false, isFormal: false })
  }
}
