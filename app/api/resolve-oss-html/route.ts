import { NextRequest, NextResponse } from 'next/server'
import { createOssClient } from '@/lib/oss'

/**
 * 公开接口：解析 HTML 中的 oss-key:// 占位符，替换为签名 URL
 * 格式: oss-key://content/xxx.jpg → https://bucket.oss.../content/xxx.jpg?签名参数
 */
export async function POST(req: NextRequest) {
  try {
    const { html } = await req.json()
    if (!html) return NextResponse.json({ html: '' })

    const client = createOssClient()
    const expires = parseInt(process.env.OSS_EXPIRES || '3600', 10)

    const resolved = html.replace(
      /oss-key:\/\/([^"'\s<>]+)/g,
      (_match: string, ossKey: string) => {
        try {
          return client.signatureUrl(ossKey, { expires })
        } catch {
          return _match
        }
      }
    )

    return NextResponse.json({ html: resolved })
  } catch (error) {
    console.error('解析 OSS HTML 失败:', error)
    return NextResponse.json({ error: '解析失败' }, { status: 500 })
  }
}
