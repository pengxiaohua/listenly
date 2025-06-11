import { NextResponse } from "next/server";
import OSS from 'ali-oss'

import { getMp3Filename } from "@/lib/getMp3Filename";

const client = new OSS({
  region: process.env.OSS_REGION!,
  accessKeyId: process.env.OSS_ACCESS_KEY_ID!,
  accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET!,
  bucket: process.env.OSS_BUCKET_NAME!,
})

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const sentence = searchParams.get('sentence')
  const dir = searchParams.get('dir')

  if (!sentence || typeof sentence !== 'string') {
    return NextResponse.json({ error: 'Missing or invalid sentence' }, { status: 400 })
  }

  // 生成 带hash的mp3 文件名, 并去掉标点, 空格转下划线
  const mp3Filename = getMp3Filename(sentence)

  const safeDir = typeof dir === 'string' && dir.trim() !== '' ? dir.trim().replace(/^\/|\/$/g, '') : ''
  const objectKey = safeDir ? `${safeDir}/${mp3Filename}` : mp3Filename

  try {
    const url = client.signatureUrl(objectKey, {
      expires: parseInt(process.env.OSS_EXPIRES || '3600', 10),
    })

    return NextResponse.json({ url }, { status: 200 })
  } catch (err) {
    console.error('OSS signature generation error:', err)
    return NextResponse.json({ error: 'Failed to generate signed URL' }, { status: 500 })
  }
}
