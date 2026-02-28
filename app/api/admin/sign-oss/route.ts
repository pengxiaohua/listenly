import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/auth'
import { createOssClient } from '@/lib/oss'

export const GET = withAdminAuth(async (req: NextRequest) => {
  try {
    const client = createOssClient()
    const { searchParams } = new URL(req.url)
    const key = searchParams.get('key')
    if (!key) return NextResponse.json({ error: '缺少key' }, { status: 400 })
    const url = client.signatureUrl(key, { expires: parseInt(process.env.OSS_EXPIRES || '3600', 10) })
    return NextResponse.json({ url })
  } catch (error) {
    console.error('生成签名URL失败:', error)
    return NextResponse.json({ error: '生成签名URL失败' }, { status: 500 })
  }
})


