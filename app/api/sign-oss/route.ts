import { NextRequest, NextResponse } from 'next/server'
import { createOssClient } from '@/lib/oss'

/**
 * 公开接口：为指定 OSS key 生成带签名的临时访问 URL
 * 仅允许对 content/ 前缀的资源签名，避免敏感文件被公开访问
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const key = searchParams.get('key')

    if (!key) {
      return NextResponse.json({ error: '缺少 key 参数' }, { status: 400 })
    }

    // 安全限制：只允许 content/ 前缀的资源
    if (!key.startsWith('content/')) {
      return NextResponse.json({ error: '不允许签名该路径' }, { status: 403 })
    }

    const client = createOssClient()
    const url = client.signatureUrl(key, {
      expires: parseInt(process.env.OSS_EXPIRES || '3600', 10),
    })

    return NextResponse.json({ url })
  } catch (error) {
    console.error('生成签名URL失败:', error)
    return NextResponse.json({ error: '生成签名URL失败' }, { status: 500 })
  }
}
