import { NextRequest, NextResponse } from 'next/server'
import OSS from 'ali-oss'
import { withAdminAuth } from '@/lib/auth'

const client = new OSS({
  region: process.env.OSS_REGION!,
  accessKeyId: process.env.OSS_ACCESS_KEY_ID!,
  accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET!,
  bucket: process.env.OSS_BUCKET_NAME!,
  secure: true,
})

export const GET = withAdminAuth(async (req: NextRequest) => {
  try {
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


