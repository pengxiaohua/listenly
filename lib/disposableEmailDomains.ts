/**
 * 一次性 / 临时邮箱域名黑名单。
 *
 * 临时邮箱常被用于刷邀请奖励，这里维护一份常见的临时邮箱域名集合，
 * 在发送验证码 / 登录环节拦截。列表非穷尽，覆盖主流临时邮箱服务即可。
 */
const DISPOSABLE_EMAIL_DOMAINS = new Set<string>([
  '0clock.net',
  '10minutemail.com',
  '10minutemail.net',
  '20minutemail.com',
  '33mail.com',
  'anonbox.net',
  'anonymbox.com',
  'binkmail.com',
  'bobmail.info',
  'bugmenot.com',
  'burnermail.io',
  'byom.de',
  'dispostable.com',
  'disposable.com',
  'disposablemail.com',
  'dropmail.me',
  'emailondeck.com',
  'emailtemporanea.com',
  'fakeinbox.com',
  'fakemail.net',
  'fakemailgenerator.com',
  'gettempmail.com',
  'getairmail.com',
  'getnada.com',
  'guerrillamail.biz',
  'guerrillamail.com',
  'guerrillamail.de',
  'guerrillamail.info',
  'guerrillamail.net',
  'guerrillamail.org',
  'guerrillamailblock.com',
  'harakirimail.com',
  'inboxbear.com',
  'inboxkitten.com',
  'jetable.org',
  'mailcatch.com',
  'maildrop.cc',
  'maileater.com',
  'mailimate.com',
  'mailinator.com',
  'mailinator.net',
  'mailnesia.com',
  'mailnull.com',
  'mailsac.com',
  'mailtemp.net',
  'mintemail.com',
  'mohmal.com',
  'moakt.com',
  'mytemp.email',
  'mytrashmail.com',
  'nada.email',
  'no-spam.ws',
  'nowmymail.com',
  'objectmail.com',
  'one-time.email',
  'onemoremail.net',
  'sharklasers.com',
  'shitmail.me',
  'spam4.me',
  'spamgourmet.com',
  'spambox.us',
  'tempmail.com',
  'tempmail.net',
  'tempmail.org',
  'tempmail.plus',
  'tempmailo.com',
  'temp-mail.org',
  'temp-mail.io',
  'tempinbox.com',
  'tempr.email',
  'throwawaymail.com',
  'trashmail.com',
  'trashmail.de',
  'trashmail.net',
  'trbvm.com',
  'wegwerfmail.de',
  'yopmail.com',
  'yopmail.fr',
  'yopmail.net',
  'zetmail.com',
])

/**
 * 判断邮箱是否属于一次性 / 临时邮箱。
 * 按域名精确匹配（含子域名归属到其父域名）。
 */
export function isDisposableEmail(email: string): boolean {
  const at = email.lastIndexOf('@')
  if (at === -1) return false
  const domain = email.slice(at + 1).trim().toLowerCase()
  if (!domain) return false

  if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) return true

  // 子域名归属：foo.mailinator.com -> mailinator.com
  const parts = domain.split('.')
  for (let i = 1; i < parts.length - 1; i++) {
    const parent = parts.slice(i).join('.')
    if (DISPOSABLE_EMAIL_DOMAINS.has(parent)) return true
  }

  return false
}

export { DISPOSABLE_EMAIL_DOMAINS }
