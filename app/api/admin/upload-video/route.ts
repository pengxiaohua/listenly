import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { withAdminAuth } from '@/lib/auth'
import { createOssClient } from '@/lib/oss'

// 生成 OSS 直传签名 URL，前端直接上传到 OSS，不经过 Next.js 服务器
export const POST = withAdminAuth(async (req: NextRequest) => {
  try {
    const body = await req.json()
    const { fileName, contentType } = body

    if (!fileName || !contentType) {
      return NextResponse.json({ error: '缺少 fileName 或 contentType' }, { status: 400 })
    }

    const allowed = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo']
    if (!allowed.includes(contentType)) {
      return NextResponse.json({ error: '仅支持 MP4/WEBM/MOV/AVI 视频' }, { status: 400 })
    }

    const ext = fileName.split('.').pop()?.toLowerCase() || 'mp4'
    const ossKey = `videos/${uuidv4()}.${ext}`

    const client = createOssClient()

    // 生成 PUT 签名 URL
    // Content-Type 必须参与签名，且前端发送时必须一致
    const signedUrl = client.signatureUrl(ossKey, {
      method: 'PUT',
      expires: 1800,
      'Content-Type': contentType,
    })

    return NextResponse.json({ success: true, ossKey, signedUrl, contentType })
  } catch (error) {
    console.error('生成上传签名失败:', error)
    return NextResponse.json({ error: '生成上传签名失败' }, { status: 500 })
  }
})
