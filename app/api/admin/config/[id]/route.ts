import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAdminAuth } from '@/lib/auth'

// PUT: Update config
export const PUT = withAdminAuth(async (req: NextRequest, { params }: { params: { id: string } }) => {
  try {
    const id = parseInt(params.id)
    const body = await req.json()
    const { type, name, content } = body

    const config = await prisma.appConfig.update({
      where: { id },
      data: {
        type,
        name,
        content
      }
    })

    return NextResponse.json(config)
  } catch (error) {
    console.error('更新配置失败:', error)
    return NextResponse.json({ error: '更新配置失败' }, { status: 500 })
  }
})

// DELETE: Delete config
export const DELETE = withAdminAuth(async (req: NextRequest, { params }: { params: { id: string } }) => {
  try {
    const id = parseInt(params.id)
    await prisma.appConfig.delete({
      where: { id }
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('删除配置失败:', error)
    return NextResponse.json({ error: '删除配置失败' }, { status: 500 })
  }
})

