import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { isPro } from '@/lib/membership'

// 非会员每天 20 次练习，会员每天 200 次练习
const FREE_DAILY_PRACTICE_LIMIT = 20
const PRO_DAILY_PRACTICE_LIMIT = 200

export async function GET() {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('userId')?.value

    if (!userId) {
      return NextResponse.json({ dailyPracticeLimit: FREE_DAILY_PRACTICE_LIMIT })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    }) as { membershipExpiresAt?: Date | null } | null

    const userIsPro = isPro(user?.membershipExpiresAt)
    const dailyPracticeLimit = userIsPro ? PRO_DAILY_PRACTICE_LIMIT : FREE_DAILY_PRACTICE_LIMIT

    return NextResponse.json({ dailyPracticeLimit, isPro: userIsPro })
  } catch (error) {
    console.error('获取每日限额失败:', error)
    return NextResponse.json({ dailyPracticeLimit: FREE_DAILY_PRACTICE_LIMIT })
  }
}
