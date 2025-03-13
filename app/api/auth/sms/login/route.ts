import { NextResponse } from 'next/server'
import { PrismaClient } from "@prisma/client"
import { cookies } from 'next/headers'
import { v4 as uuidv4 } from 'uuid'

const prisma = new PrismaClient()

export async function POST(req: Request) {
  try {
    const { phone, code } = await req.json()

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
      user = await prisma.user.create({
        data: {
          id: uuidv4(),
          phone
        }
      })
    }

    // 更新最后登录时间
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    })

    // 设置登录态 cookie
    cookies().set('userId', user.id, {
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