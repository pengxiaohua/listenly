import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
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
    const cookieStore = await cookies()
    const userId = cookieStore.get('userId')?.value
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const form = await req.formData()
    const file = form.get('audio') as File | null
    if (!file) {
      return NextResponse.json({ error: '缺少音频文件' }, { status: 400 })
    }

    const extFromType = (mime: string) => {
      if (mime.includes('wav')) return 'wav'
      if (mime.includes('mp3') || mime.includes('mpeg')) return 'mp3'
      if (mime.includes('ogg') || mime.includes('opus')) return 'ogg'
      if (mime.includes('aac')) return 'aac'
      if (mime.includes('amr')) return 'amrnb'
      if (mime.includes('silk')) return 'silk'
      return 'wav'
    }

    const audioFormat = extFromType(file.type)
    const fileName = `${uuidv4()}.${audioFormat}`
    const ossKey = `shadowing-mp3/${userId}/${fileName}`

    const buffer = Buffer.from(await file.arrayBuffer())
    await client.put(ossKey, buffer, { headers: { 'Content-Type': file.type || 'audio/wav' } })

    const signedUrl = client.signatureUrl(ossKey, { expires: parseInt(process.env.OSS_EXPIRES || '3600', 10) })

    return NextResponse.json({ success: true, ossKey, url: signedUrl, audioFormat })
  } catch (error) {
    console.error('上传跟读音频失败:', error)
    return NextResponse.json({ error: '上传失败' }, { status: 500 })
  }
}


