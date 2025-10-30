import { NextResponse } from 'next/server'

export async function POST() {
  const response = NextResponse.json({ success: true })
  const isProd = process.env.NODE_ENV === 'production'
  const cookieDomain = process.env.COOKIE_DOMAIN // 可选：例如 .listenly.cn
  response.cookies.set('userId', '', {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    ...(cookieDomain ? { domain: cookieDomain } : {}),
    expires: new Date(0),
  })

  return response
}
