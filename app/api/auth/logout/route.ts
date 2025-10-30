import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const response = NextResponse.json({ success: true })
  const isProd = process.env.NODE_ENV === 'production'
  const cookieDomainFromEnv = process.env.COOKIE_DOMAIN // 可选：例如 .listenly.cn

  // 计算当前请求域名，准备多种变体，确保删除所有可能的 userId Cookie
  const url = new URL(request.url)
  const host = url.hostname // 例如 listenly.cn 或 www.listenly.cn

  const domains: Array<string | undefined> = [
    undefined, // host-only
    host, // 裸域
    host.startsWith('.') ? host : `.${host}`, // .裸域
    cookieDomainFromEnv,
  ]
    .filter(Boolean)
    // 去重
    .filter((d, i, arr) => arr.indexOf(d) === i)

  for (const domain of domains) {
    response.cookies.set('userId', '', {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      ...(domain ? { domain } : {}),
      // 同时设置 Expires 与 Max-Age，最大概率促使浏览器删除
      expires: new Date(0),
      maxAge: 0,
    })
  }

  return response
}
