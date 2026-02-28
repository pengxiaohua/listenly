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

    // Allow images, audio, video
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
      'audio/mpeg', 'audio/mp3', 'audio/wav',
      'video/mp4', 'video/webm'
    ]

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: '不支持的文件类型' }, { status: 400 })
    }

    const maxSize = 50 * 1024 * 1024 // 50MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: '文件大小不能超过 50MB' }, { status: 400 })
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || ''
    const fileName = `${uuidv4()}.${ext}`
    const ossKey = `content/${fileName}`

    const buffer = Buffer.from(await file.arrayBuffer())
    const client = createOssClient()
    await client.put(ossKey, buffer, { headers: { 'Content-Type': file.type } })

    // Generate signed URL (or public URL if bucket is public read)
    // Assuming private bucket requiring signature, or we just return the key and let frontend sign it.
    // The existing code in upload-cover-image returns a signed URL.
    const url = client.signatureUrl(ossKey, { expires: parseInt(process.env.OSS_EXPIRES || '3600', 10) })

    return NextResponse.json({ success: true, ossKey, url })
  } catch (error) {
    console.error('上传内容失败:', error)
    return NextResponse.json({ error: '上传失败' }, { status: 500 })
  }
})

