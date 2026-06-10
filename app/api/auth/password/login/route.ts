import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { verifyPassword } from '@/lib/password'

export async function POST(req: Request) {
  try {
    const { account, password } = await req.json()

    if (!account || typeof account !== 'string' || !password || typeof password !== 'string') {
      return NextResponse.json({ error: '请输入账号和密码' }, { status: 400 })
    }

    const trimmed = account.trim()

    // 账号支持：登录账号 / 邮箱 / 手机号
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { loginName: trimmed },
          { email: trimmed },
          { phone: trimmed },
        ],
      },
    })

    // 统一错误提示，避免暴露账号是否存在
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return NextResponse.json({ error: '账号或密码错误' }, { status: 401 })
    }

    // 更新设备与最近登录时间
    const ua = req.headers.get('user-agent') || ''
    const deviceOS = /iphone|ipad|ipod|ios/i.test(ua) ? 'iOS'
      : /android/i.test(ua) ? 'Android'
      : /mac os x|macintosh/i.test(ua) ? 'Mac'
      : /windows/i.test(ua) ? 'Windows'
      : /linux/i.test(ua) ? 'Linux'
      : 'Unknown'

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date(), deviceOS },
    })

    const cookieStore = await cookies()
    cookieStore.set('userId', user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('账号密码登录失败:', error)
    return NextResponse.json({ error: '登录失败' }, { status: 500 })
  }
}
