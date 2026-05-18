import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isPro } from '@/lib/membership'

// 非会员每天 20 次练习，会员每天 200 次练习
const FREE_DAILY_PRACTICE_LIMIT = 20
const PRO_DAILY_PRACTICE_LIMIT = 200

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { shadowingId, score, rawResult, audioOssKey, ossUrl, sentence } = body

  if (!shadowingId) {
    return NextResponse.json({ error: '参数缺失' }, { status: 400 })
  }

  const userId = req.headers.get('x-user-id')
  if (!userId) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }

  // 获取用户会员状态，决定每日限额
  const user = await prisma.user.findUnique({
    where: { id: userId },
  }) as { membershipExpiresAt?: Date | null } | null
  const userIsPro = isPro(user?.membershipExpiresAt)
  const dailyLimit = userIsPro ? PRO_DAILY_PRACTICE_LIMIT : FREE_DAILY_PRACTICE_LIMIT

  // 限制：每天最多练习 N 次（按当天有录音的记录总数）
  const now = new Date()
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  const end = new Date(now)
  end.setHours(24, 0, 0, 0)

  const todayCount = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count
    FROM "ShadowingRecord"
    WHERE "userId" = ${userId}
      AND "createdAt" >= ${start}
      AND "createdAt" < ${end}
      AND "ossUrl" IS NOT NULL
  `.then(rows => Number(rows[0]?.count ?? 0))

  if (todayCount >= dailyLimit) {
    const msg = userIsPro
      ? `今日已达跟读上限（${dailyLimit} 次），请明天再来`
      : `今日已达跟读上限（${dailyLimit} 次），开通会员可享每天 ${PRO_DAILY_PRACTICE_LIMIT} 次练习额度`
    return NextResponse.json({ error: msg }, { status: 429 })
  }

  await prisma.$executeRaw`INSERT INTO "ShadowingRecord" ("userId", "shadowingId", "score", "rawResult", "audioOssKey", "ossUrl", "shadowingSentence")
    VALUES (${userId}, ${Number(shadowingId)}, ${typeof score === 'number' ? Math.round(score) : null}, ${rawResult ?? null}, ${audioOssKey ?? null}, ${ossUrl ?? null}, ${sentence ?? null})`

  return NextResponse.json({ success: true })
}
