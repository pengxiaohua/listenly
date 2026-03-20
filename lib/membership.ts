/**
 * 判断用户是否为 Pro 会员（纯运行时计算，不存储到数据库）
 */
export function isPro(membershipExpiresAt: Date | null | undefined): boolean {
  if (!membershipExpiresAt) return false;
  return new Date(membershipExpiresAt) > new Date();
}
