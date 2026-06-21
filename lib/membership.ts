/**
 * 会员计算集中化模块
 *
 * 把会员套餐天数常量与到期时间计算逻辑集中在一处，供所有发放点 / 读取点统一引用，
 * 避免「累计游标」算法在多个文件里各自拷贝、不一致。
 */

/** 邀请奖励发放天数（邀请人/被邀请人各得） */
export const INVITE_REWARD_DAYS = 3;

/**
 * 各套餐对应的会员天数。
 * - trial：试用 3 天
 * - test：测试 1 天
 * - monthly/quarterly/yearly：正式会员
 * - invite_inviter / invite_invitee：邀请奖励（各 3 天）
 */
export const PLAN_DAYS: Record<string, number> = {
  trial: 3,
  test: 1,
  monthly: 30,
  quarterly: 90,
  yearly: 365,
  invite_inviter: INVITE_REWARD_DAYS,
  invite_invitee: INVITE_REWARD_DAYS,
};

/** 「正式会员」套餐集合（仅这些计入正式会员资格 / 排行榜正式标签判定） */
export const FORMAL_PLANS = ['monthly', 'quarterly', 'yearly'] as const;

/** 邀请奖励相关的套餐集合（不污染试用 / 正式会员资格判定） */
export const INVITE_PLANS = ['invite_inviter', 'invite_invitee'] as const;

const DAY_MS = 24 * 60 * 60 * 1000;

export type OrderLike = { plan: string; createdAt: Date | string };

/** 是否为邀请奖励套餐 */
export function isInvitePlan(plan: string): boolean {
  return (INVITE_PLANS as readonly string[]).includes(plan);
}

/** 是否为正式会员套餐 */
export function isFormalPlan(plan: string): boolean {
  return (FORMAL_PLANS as readonly string[]).includes(plan);
}

/**
 * 判断用户是否为 Pro 会员（纯运行时计算，不存储到数据库）
 */
export function isPro(membershipExpiresAt: Date | null | undefined): boolean {
  if (!membershipExpiresAt) return false;
  return new Date(membershipExpiresAt) > new Date();
}

/**
 * 基于一组按时间升序排列的订单，用「累计游标」算法计算到期时间戳（ms）。
 *
 * 起始日 = max(上一个订单累计到期时间, 当前订单创建时间)，再叠加该套餐天数。
 * 这样无论支付回调顺序、重复触发，结果都是确定性的。
 *
 * @param orders 订单列表（无需预先排序，内部会按 createdAt 升序处理）
 * @param accept 可选过滤器，仅累计 accept(plan) === true 的订单
 * @returns 到期时间戳（ms）；没有任何匹配订单时返回 0
 */
function accumulate(
  orders: OrderLike[],
  accept?: (plan: string) => boolean
): number {
  const sorted = [...orders].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  let cursor = 0;
  for (const o of sorted) {
    if (accept && !accept(o.plan)) continue;
    const days = PLAN_DAYS[o.plan] ?? 30;
    const oTime = new Date(o.createdAt).getTime();
    const start = cursor > oTime ? cursor : oTime;
    cursor = start + days * DAY_MS;
  }
  return cursor;
}

/**
 * 计算所有（含试用 / 邀请等）已支付订单叠加后的会员到期时间。
 * 纯函数版本，便于单测。
 */
export function computeMembershipExpiry(orders: OrderLike[]): Date {
  return new Date(accumulate(orders));
}

/**
 * 计算「正式会员」到期时间（仅叠加 monthly/quarterly/yearly）。
 * 用于判断邀请人在某一时刻是否为「有效期内的正式会员」，不被试用 / 邀请奖励污染。
 *
 * @returns 正式会员到期时间；从无正式订单时返回 null
 */
export function getFormalMembershipExpiry(orders: OrderLike[]): Date | null {
  const cursor = accumulate(orders, isFormalPlan);
  return cursor > 0 ? new Date(cursor) : null;
}

/**
 * 基于用户所有已支付订单重新计算并写回 membershipExpiresAt。
 * 所有发放点（支付回调 / 试用 / 赠送 / 邀请奖励）统一调用，保证结果确定。
 *
 * @param tx Prisma 客户端或事务客户端
 * @param userId 用户 ID
 * @returns 新的会员到期时间
 */
export async function recomputeMembershipExpiry(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx: any,
  userId: string
): Promise<Date> {
  const allPaidOrders: OrderLike[] = await tx.order.findMany({
    where: { userId, status: 'paid' },
    orderBy: { createdAt: 'asc' },
    select: { plan: true, createdAt: true },
  });

  const expiry = computeMembershipExpiry(allPaidOrders);

  await tx.user.update({
    where: { id: userId },
    data: { membershipExpiresAt: expiry },
  });

  return expiry;
}
