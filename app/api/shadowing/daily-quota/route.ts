import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { isPro } from '@/lib/membership'

// 非会员每天 5 个句子（共 15 次），会员每天 40 个句子（共 120 次）
const FREE_DAILY_SENTENCE_LIMIT = 5
const PRO_DAILY_SENTENCE_LIMIT = 40

export async function GET() {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('userId')?.value

    if (!userId) {
      return NextResponse.json({ dailySentenceLimit: FREE_DAILY_SENTENCE_LIMIT })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    }) as { membershipExpiresAt?: Date | null } | null

    const userIsPro = isPro(user?.membershipExpiresAt)
    const dailySentenceLimit = userIsPro ? PRO_DAILY_SENTENCE_LIMIT : FREE_DAILY_SENTENCE_LIMIT

    return NextResponse.json({ dailySentenceLimit, isPro: userIsPro })
  } catch (error) {
    console.error('获取每日限额失败:', error)
    return NextResponse.json({ dailySentenceLimit: FREE_DAILY_SENTENCE_LIMIT })
  }
}
