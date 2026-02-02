import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'

// GET: 获取用户已读的功能更新版本
export async function GET() {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('userId')?.value

    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { config: true }
    })

    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    const config = (user.config as Record<string, unknown>) || {}
    const readVersion = (config.featureUpdateReadVersion as string) || ''

    return NextResponse.json({ readVersion })
  } catch (error) {
    console.error('获取功能更新已读版本失败:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

// PUT: 更新用户已读的功能更新版本
export async function PUT(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('userId')?.value

    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const { version } = await req.json()

    if (!version) {
      return NextResponse.json({ error: '版本号不能为空' }, { status: 400 })
    }

    // 获取当前用户配置
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { config: true }
    })

    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    const currentConfig = (user.config as Record<string, unknown>) || {}

    // 更新用户配置
    await prisma.user.update({
      where: { id: userId },
      data: {
        config: {
          ...currentConfig,
          featureUpdateReadVersion: version
        }
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('更新功能更新已读版本失败:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
