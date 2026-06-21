/**
 * 邀请有奖核心逻辑
 *
 * 邀请关系不新增独立表：用 User.invitedById 表达「被谁邀请」，
 * 用 invite_inviter / invite_invitee 两种订单表达「奖励发放记录」。
 */
import { randomInt } from 'crypto'
import { prisma } from '@/lib/prisma'
import {
  INVITE_REWARD_DAYS,
  getFormalMembershipExpiry,
  recomputeMembershipExpiry,
} from '@/lib/membership'

const CODE_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789'
const CODE_LENGTH = 6

/** 邀请人每自然月最多可获得的奖励天数 */
export const INVITE_MONTHLY_CAP_DAYS = 30

/** 生成 6 位 [a-z0-9] 邀请码 */
export function generateInviteCode(): string {
  let code = ''
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]
  }
  return code
}

/** 校验邀请码格式（6 位小写字母 / 数字） */
export function isValidInviteCodeFormat(code: string): boolean {
  return /^[a-z0-9]{6}$/.test(code)
}

/** 当前自然月的起止时间（本地时区） */
function currentMonthRange(now = new Date()): { start: Date; end: Date } {
  const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0)
  return { start, end }
}

/**
 * 懒生成并持久化用户的唯一邀请码（幂等）。
 * 已有则直接返回；并发 / 冲突时重试。
 */
export async function ensureInviteCode(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { inviteCode: true },
  })
  if (!user) throw new Error('用户不存在')
  if (user.inviteCode) return user.inviteCode

  for (let attempt = 0; attempt < 12; attempt++) {
    const code = generateInviteCode()
    try {
      // 仅当当前仍为空时写入，避免并发请求互相覆盖
      const res = await prisma.user.updateMany({
        where: { id: userId, inviteCode: null },
        data: { inviteCode: code },
      })
      if (res.count === 1) return code

      // 已被并发请求设置，读取已有值返回
      const fresh = await prisma.user.findUnique({
        where: { id: userId },
        select: { inviteCode: true },
      })
      if (fresh?.inviteCode) return fresh.inviteCode
    } catch (error) {
      // 邀请码唯一约束冲突（P2002）→ 换一个再试
      const code = (error as { code?: string })?.code
      if (code === 'P2002') continue
      throw error
    }
  }
  throw new Error('邀请码生成失败，请重试')
}

export interface InviteeSummary {
  id: string
  userName: string
  avatar: string | null
  joinedAt: string
}

export interface InviteStats {
  invitedCount: number
  rewardDaysThisMonth: number
  monthlyCap: number
  eligibleToInvite: boolean
  invitees: InviteeSummary[]
}

/**
 * 统计某用户的邀请数据与发奖资格。
 * - invitedCount：被该用户邀请且已获奖的好友数（invitedById = userId）
 * - rewardDaysThisMonth：本自然月已获得的邀请奖励天数（invite_inviter 订单数 × 3）
 * - eligibleToInvite：当前是否为「有效期内正式会员」（仅 monthly/quarterly/yearly 计入）
 */
export async function getInviteStats(userId: string): Promise<InviteStats> {
  const { start, end } = currentMonthRange()

  const [invitees, inviterRewardOrders, paidOrders] = await Promise.all([
    prisma.user.findMany({
      where: { invitedById: userId },
      select: { id: true, userName: true, avatar: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.order.count({
      where: {
        userId,
        status: 'paid',
        plan: 'invite_inviter',
        createdAt: { gte: start, lt: end },
      },
    }),
    prisma.order.findMany({
      where: { userId, status: 'paid' },
      select: { plan: true, createdAt: true },
    }),
  ])

  const formalExpiry = getFormalMembershipExpiry(paidOrders)
  const eligibleToInvite = !!formalExpiry && formalExpiry.getTime() > Date.now()

  return {
    invitedCount: invitees.length,
    rewardDaysThisMonth: inviterRewardOrders * INVITE_REWARD_DAYS,
    monthlyCap: INVITE_MONTHLY_CAP_DAYS,
    eligibleToInvite,
    invitees: invitees.map((u) => ({
      id: u.id,
      userName: u.userName,
      avatar: u.avatar ?? null,
      joinedAt: u.createdAt.toISOString(),
    })),
  }
}

export interface GrantInviteRewardResult {
  granted: boolean
  reason?:
    | 'invalid_code'
    | 'self_invite'
    | 'inviter_not_found'
    | 'inviter_not_formal'
  /** 是否给邀请人也发了奖励（未达月度上限） */
  inviterRewarded?: boolean
}

/**
 * 邀请奖励发放核心（在新用户注册事务中调用）。
 *
 * 规则：
 * 1. 邀请资格：邀请人必须是「注册此刻」有效期内的正式会员，否则双方都不发。
 * 2. 月度封顶：邀请人每自然月最多 30 天奖励；超出后被邀请人仍得 3 天，邀请人不再加。
 * 3. 仅全新用户：调用方需保证 newUser 为刚创建的全新用户。
 * 4. 即时发放：被邀请人 + 邀请人各 3 天，与现有会员时长叠加。
 *
 * @param inviteCode 被邀请人携带的邀请码
 * @param newUserId 新用户（被邀请人）ID
 * @param tx Prisma 事务客户端（必须，确保发放原子性）
 */
export async function grantInviteReward(params: {
  inviteCode: string
  newUserId: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx: any
}): Promise<GrantInviteRewardResult> {
  const { inviteCode, newUserId, tx } = params

  const code = inviteCode.trim().toLowerCase()
  if (!isValidInviteCodeFormat(code)) {
    return { granted: false, reason: 'invalid_code' }
  }

  const inviter = await tx.user.findUnique({
    where: { inviteCode: code },
    select: { id: true },
  })
  if (!inviter) {
    return { granted: false, reason: 'inviter_not_found' }
  }
  if (inviter.id === newUserId) {
    return { granted: false, reason: 'self_invite' }
  }

  // 规则 1：邀请人必须是「此刻」有效期内的正式会员
  const inviterPaidOrders = await tx.order.findMany({
    where: { userId: inviter.id, status: 'paid' },
    select: { plan: true, createdAt: true },
  })
  const inviterFormalExpiry = getFormalMembershipExpiry(inviterPaidOrders)
  if (!inviterFormalExpiry || inviterFormalExpiry.getTime() <= Date.now()) {
    return { granted: false, reason: 'inviter_not_formal' }
  }

  // 规则 4：给被邀请人发 3 天，并标记 invitedById（标记仅在真实拿到奖励时设置）
  await tx.order.create({
    data: {
      outTradeNo: `INVITE-INVITEE-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      userId: newUserId,
      plan: 'invite_invitee',
      amount: 0,
      status: 'paid',
      transactionId: 'INVITE_REWARD',
    },
  })
  await tx.user.update({
    where: { id: newUserId },
    data: { invitedById: inviter.id },
  })
  await recomputeMembershipExpiry(tx, newUserId)

  // 规则 2：邀请人当月奖励天数未达上限才给邀请人发 3 天
  const { start, end } = currentMonthRange()
  const inviterRewardCountThisMonth = await tx.order.count({
    where: {
      userId: inviter.id,
      status: 'paid',
      plan: 'invite_inviter',
      createdAt: { gte: start, lt: end },
    },
  })
  const rewardedDaysThisMonth = inviterRewardCountThisMonth * INVITE_REWARD_DAYS

  let inviterRewarded = false
  if (rewardedDaysThisMonth + INVITE_REWARD_DAYS <= INVITE_MONTHLY_CAP_DAYS) {
    await tx.order.create({
      data: {
        outTradeNo: `INVITE-INVITER-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        userId: inviter.id,
        plan: 'invite_inviter',
        amount: 0,
        status: 'paid',
        transactionId: 'INVITE_REWARD',
      },
    })
    await recomputeMembershipExpiry(tx, inviter.id)
    inviterRewarded = true
  }

  return { granted: true, inviterRewarded }
}
