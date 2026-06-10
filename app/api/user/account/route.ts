import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import {
  hashPassword,
  verifyPassword,
  isValidLoginName,
  isValidPassword,
} from '@/lib/password'

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('userId')?.value
    if (!userId) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }

    const { loginName, password, currentPassword } = await req.json()

    if (typeof loginName !== 'string' || !isValidLoginName(loginName)) {
      return NextResponse.json(
        { error: '账号需为 4-20 位字母、数字或下划线，且至少包含一个字母' },
        { status: 400 }
      )
    }

    if (typeof password !== 'string' || !isValidPassword(password)) {
      return NextResponse.json({ error: '密码长度需为 6-32 位' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    // 已设置过密码时，修改需校验当前密码
    if (user.passwordHash) {
      if (typeof currentPassword !== 'string' || !verifyPassword(currentPassword, user.passwordHash)) {
        return NextResponse.json({ error: '当前密码不正确' }, { status: 400 })
      }
    }

    // 账号唯一性校验（被其他用户占用则拒绝）
    const existing = await prisma.user.findUnique({ where: { loginName } })
    if (existing && existing.id !== userId) {
      return NextResponse.json({ error: '该账号已被使用，请更换' }, { status: 409 })
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        loginName,
        passwordHash: hashPassword(password),
      },
    })

    return NextResponse.json({ success: true, loginName })
  } catch (error) {
    console.error('设置账号密码失败:', error)
    // 唯一约束冲突（如账号被并发占用）返回具体提示
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: '该账号已被使用，请更换' }, { status: 409 })
    }
    return NextResponse.json({ error: '设置失败' }, { status: 500 })
  }
}
