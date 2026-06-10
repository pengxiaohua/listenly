import { scryptSync, randomBytes, timingSafeEqual } from 'crypto'

const KEY_LENGTH = 64

/**
 * 生成密码哈希，格式为 `salt:hash`（均为 hex）。
 * 使用 Node 内置 scrypt，无需额外依赖。
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, KEY_LENGTH).toString('hex')
  return `${salt}:${hash}`
}

/**
 * 校验明文密码与已存储的哈希是否匹配（常量时间比较）。
 */
export function verifyPassword(password: string, stored: string | null | undefined): boolean {
  if (!stored) return false
  const [salt, key] = stored.split(':')
  if (!salt || !key) return false
  const keyBuffer = Buffer.from(key, 'hex')
  const hashBuffer = scryptSync(password, salt, KEY_LENGTH)
  if (keyBuffer.length !== hashBuffer.length) return false
  return timingSafeEqual(keyBuffer, hashBuffer)
}

/**
 * 校验登录账号格式：4-20 位，字母/数字/下划线，且必须包含至少一个字母（避免与纯手机号混淆）。
 */
export function isValidLoginName(loginName: string): boolean {
  return /^[a-zA-Z0-9_]{4,20}$/.test(loginName) && /[a-zA-Z]/.test(loginName)
}

/**
 * 校验密码强度：6-32 位。
 */
export function isValidPassword(password: string): boolean {
  return typeof password === 'string' && password.length >= 6 && password.length <= 32
}
