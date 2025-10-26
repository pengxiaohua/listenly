import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { v4 as uuidv4 } from 'uuid'
import { generateUserProfile } from '@/lib/generateUserProfile'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const { phone, code } = await req.json()
    // 解析 UA 与 IP
    const ua = (req.headers as any).get?.('user-agent') || (req as any).headers?.get?.('user-agent') || ''
    const ip = (req.headers as any).get?.('x-forwarded-for') || (req as any).headers?.get?.('x-forwarded-for') || ''
    const deviceOS = /iphone|ipad|ipod|ios/i.test(ua) ? 'iOS'
      : /android/i.test(ua) ? 'Android'
      : /mac os x|macintosh/i.test(ua) ? 'Mac'
      : /windows/i.test(ua) ? 'Windows'
      : /linux/i.test(ua) ? 'Linux'
      : 'Unknown'
    // 简易 IP -> 省市占位：如有专用服务可替换
    const location = typeof ip === 'string' && ip ? null : null

    // 验证码校验
    const smsCode = await prisma.smsCode.findUnique({
      where: { phone }
    })

    if (!smsCode || smsCode.code !== code || smsCode.expiresAt < new Date()) {
      return NextResponse.json({ error: '验证码无效或已过期' }, { status: 400 })
    }

    // 删除已使用的验证码
    await prisma.smsCode.delete({
      where: { phone }
    })

    // 查找或创建用户
    let user = await prisma.user.findUnique({
      where: { phone }
    })

    if (!user) {
      const { userName, avatar } = generateUserProfile()
      // 创建新用户
      user = await prisma.user.create({
        data: {
          id: uuidv4(),
          phone,
          userName,
          avatar,
          createdAt: new Date(),
          lastLogin: new Date(),
          deviceOS,
          location,
        }
      })
    } else {
      // 更新最后登录时间
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date(), deviceOS, location }
      })
    }

    // 设置登录态 cookie
    const cookieStore = await cookies()
    cookieStore.set('userId', user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 // 30 days
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('短信登录失败:', error)
    return NextResponse.json({ error: '登录失败' }, { status: 500 })
  }
}
