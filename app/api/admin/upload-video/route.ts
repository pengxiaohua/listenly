import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { withAdminAuth } from '@/lib/auth'
import { createOssClient } from '@/lib/oss'

export const POST = withAdminAuth(async (req: NextRequest) => {
  try {
    const form = await req.formData()
    const file = form.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: '缺少文件' }, { status: 400 })
    }

    const allowed = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo']
    if (!allowed.includes(file.type)) {
      return NextResponse.json({ error: '仅支持 MP4/WEBM/MOV/AVI 视频' }, { status: 400 })
    }

    const maxSize = 500 * 1024 * 1024 // 500MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: '文件大小不能超过 500MB' }, { status: 400 })
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'mp4'
    const fileName = `${uuidv4()}.${ext}`
    const ossKey = `videos/${fileName}`

    const buffer = Buffer.from(await file.arrayBuffer())
    const client = createOssClient()
    await client.put(ossKey, buffer, { headers: { 'Content-Type': file.type } })

    const url = client.signatureUrl(ossKey, {
      expires: parseInt(process.env.OSS_EXPIRES || '3600', 10),
    })

    return NextResponse.json({ success: true, ossKey, url })
  } catch (error) {
    console.error('上传视频失败:', error)
    return NextResponse.json({ error: '上传失败' }, { status: 500 })
  }
})
