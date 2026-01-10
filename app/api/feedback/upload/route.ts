import { NextRequest, NextResponse } from 'next/server'
import OSS from 'ali-oss'
import { v4 as uuidv4 } from 'uuid'

const client = new OSS({
  region: process.env.OSS_REGION!,
  accessKeyId: process.env.OSS_ACCESS_KEY_ID!,
  accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET!,
  bucket: process.env.OSS_BUCKET_NAME!,
  secure: true,
})

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const form = await req.formData()
    const file = form.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: '缺少文件' }, { status: 400 })
    }

    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowed.includes(file.type)) {
      return NextResponse.json({ error: '仅支持 PNG/JPG/JPEG/WEBP 图片' }, { status: 400 })
    }

    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json({ error: '文件大小不能超过 5MB' }, { status: 400 })
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const fileName = `${uuidv4()}.${ext}`
    const ossKey = `feedback-images/${fileName}`

    const buffer = Buffer.from(await file.arrayBuffer())
    await client.put(ossKey, buffer, { headers: { 'Content-Type': file.type } })

    // 生成带签名的URL，方便前端直接回显（如果OSS bucket是私有的）
    const url = client.signatureUrl(ossKey, { expires: parseInt(process.env.OSS_EXPIRES || '3600', 10) })

    return NextResponse.json({ success: true, ossKey, url })
  } catch (error) {
    console.error('上传反馈图片失败:', error)
    return NextResponse.json({ error: '上传失败' }, { status: 500 })
  }
}
