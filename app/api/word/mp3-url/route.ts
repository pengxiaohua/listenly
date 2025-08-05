import { NextResponse } from "next/server";
import OSS from 'ali-oss'

import { getMp3Filename } from "@/lib/getMp3Filename";

const client = new OSS({
  region: process.env.OSS_REGION!,
  accessKeyId: process.env.OSS_ACCESS_KEY_ID!,
  accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET!,
  bucket: process.env.OSS_BUCKET_NAME!,
  secure: true, // 强制使用HTTPS
})

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const word = searchParams.get('word')
  const dir = searchParams.get('dir')

  if (!word || typeof word !== 'string') {
    return NextResponse.json({ error: 'Missing or invalid sentence' }, { status: 400 })
  }

  // 生成 带hash的mp3 文件名, 并去掉标点, 空格转下划线
  const mp3Filename = getMp3Filename(word)

  const safeDir = typeof dir === 'string' && dir.trim() !== '' ? dir.trim().replace(/^\/|\/$/g, '') : ''
  const objectKey = safeDir ? `${safeDir}/${mp3Filename}` : mp3Filename

  try {
    // 先检查文件是否存在
    try {
      await client.head(objectKey)
    } catch (headErr: unknown) {
      // 如果文件不存在（404错误），返回空字符串
      const error = headErr as { code?: string; status?: number }
      if (error.code === 'NoSuchKey' || error.status === 404) {
        return NextResponse.json({ url: '' }, { status: 200 })
      }
      // 其他错误继续抛出
      throw headErr
    }

    // 文件存在，生成签名URL
    const url = client.signatureUrl(objectKey, {
      expires: parseInt(process.env.OSS_EXPIRES || '3600', 10),
    })

    return NextResponse.json({ url }, { status: 200 })
  } catch (err) {
    console.error('OSS signature generation error:', err)
    return NextResponse.json({ error: 'Failed to generate signed URL' }, { status: 500 })
  }
}
