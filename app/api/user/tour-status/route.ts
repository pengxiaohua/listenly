import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

// GET: 检查用户是否已完成某个引导
export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('userId')?.value

    if (!userId) {
      return NextResponse.json({ completed: false })
    }

    const key = req.nextUrl.searchParams.get('key')
    if (!key) {
      return NextResponse.json({ error: '缺少 key 参数' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { config: true },
    })

    if (!user) {
      return NextResponse.json({ completed: false })
    }

    const config = (user.config as Record<string, unknown>) || {}
    const completedTours = (config.completedTours as Record<string, boolean>) || {}

    return NextResponse.json({ completed: !!completedTours[key] })
  } catch (error) {
    console.error('获取引导状态失败:', error)
    return NextResponse.json({ completed: false })
  }
}

// PUT: 标记某个引导为已完成
export async function PUT(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('userId')?.value

    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const { key } = await req.json()
    if (!key) {
      return NextResponse.json({ error: '缺少 key' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { config: true },
    })

    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    const currentConfig = (user.config as Record<string, unknown>) || {}
    const completedTours = (currentConfig.completedTours as Record<string, boolean>) || {}

    await prisma.user.update({
      where: { id: userId },
      data: {
        config: {
          ...currentConfig,
          completedTours: {
            ...completedTours,
            [key]: true,
          },
        },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('更新引导状态失败:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
