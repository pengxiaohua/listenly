import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAdminAuth } from '@/lib/auth'

type AppConfigRecord = {
  id: number
  type: string
  name: string
  content: string
  createdAt: Date
  updatedAt: Date
}

type AppConfigDelegate = {
  findMany: (args?: unknown) => Promise<AppConfigRecord[]>
  findUnique: (args: unknown) => Promise<AppConfigRecord | null>
  create: (args: unknown) => Promise<AppConfigRecord>
}

const appConfigModel = (prisma as unknown as { appConfig: AppConfigDelegate }).appConfig

// GET: List all configs
export const GET = withAdminAuth(async () => {
  try {
    const configs = await appConfigModel.findMany({
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json(configs)
  } catch (error) {
    console.error('获取配置失败:', error)
    return NextResponse.json({ error: '获取配置失败' }, { status: 500 })
  }
})

// POST: Create new config
export const POST = withAdminAuth(async (req: NextRequest) => {
  try {
    const body = await req.json()
    const { type, name, content } = body

    if (!type || !name || !content) {
      return NextResponse.json({ error: '请填写所有必填项' }, { status: 400 })
    }

    // Check if name exists
    const existing = await appConfigModel.findUnique({
      where: { name }
    })

    if (existing) {
      return NextResponse.json({ error: '该配置名称已存在' }, { status: 400 })
    }

    const config = await appConfigModel.create({
      data: {
        type,
        name,
        content
      }
    })

    return NextResponse.json(config)
  } catch (error) {
    console.error('创建配置失败:', error)
    return NextResponse.json({ error: '创建配置失败' }, { status: 500 })
  }
})

