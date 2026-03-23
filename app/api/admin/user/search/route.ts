import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAdminAuth } from '@/lib/auth'
import { createOssClient } from '@/lib/oss'

function signAvatar(avatar: string, client: ReturnType<typeof createOssClient>) {
  if (avatar?.startsWith('avatars/')) {
    try {
      return client.signatureUrl(avatar, {
        expires: parseInt(process.env.OSS_EXPIRES || '3600', 10),
      })
    } catch { /* ignore */ }
  }
  return avatar
}

export const GET = withAdminAuth(async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')?.trim()

    if (!id) {
      return NextResponse.json({ user: null })
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, userName: true, avatar: true, phone: true },
    })

    if (!user) {
      return NextResponse.json({ user: null })
    }

    const client = createOssClient()
    return NextResponse.json({
      user: { ...user, avatar: signAvatar(user.avatar, client) },
    })
  } catch (error) {
    console.error('搜索用户失败:', error)
    return NextResponse.json({ error: '搜索失败' }, { status: 500 })
  }
})
