import { NextRequest, NextResponse } from 'next/server'
import { ensureInviteCode, getInviteStats } from '@/lib/invite'
import { createOssClient, resolveAvatarUrl } from '@/lib/oss'

export async function GET(request: NextRequest) {
  const userId = request.cookies.get('userId')?.value
  if (!userId) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }

  try {
    const inviteCode = await ensureInviteCode(userId)
    const stats = await getInviteStats(userId)

    // 邀请链接：根路径 + ?invite=CODE
    const origin = new URL(request.url).origin
    const inviteUrl = `${origin.replace(/\/$/, '')}/?invite=${inviteCode}`

    // 为被邀请好友头像生成可访问 URL
    const client = createOssClient()
    const invitees = stats.invitees.map((u) => ({
      ...u,
      avatar: resolveAvatarUrl(client, u.avatar) ?? null,
    }))

    return NextResponse.json({
      inviteCode,
      inviteUrl,
      invitedCount: stats.invitedCount,
      rewardDaysThisMonth: stats.rewardDaysThisMonth,
      monthlyCap: stats.monthlyCap,
      eligibleToInvite: stats.eligibleToInvite,
      invitees,
    })
  } catch (error) {
    console.error('获取邀请信息失败:', error)
    return NextResponse.json({ error: '获取邀请信息失败' }, { status: 500 })
  }
}
