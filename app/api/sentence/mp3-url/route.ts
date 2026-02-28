import { NextResponse } from "next/server";
import { getMp3Filename } from "@/lib/getMp3Filename";
import { prisma } from "@/lib/prisma";
import { createOssClient } from '@/lib/oss'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const sentence = searchParams.get('sentence')
  const sentenceSetSlug = searchParams.get('sentenceSet')

  if (!sentence || typeof sentence !== 'string') {
    return NextResponse.json({ error: 'Missing or invalid sentence' }, { status: 400 })
  }

  let dir = searchParams.get('dir')
  if (!dir && sentenceSetSlug) {
    const sentenceSet = await prisma.sentenceSet.findUnique({
      where: { slug: sentenceSetSlug },
      select: { ossDir: true }
    })
    if (sentenceSet?.ossDir) {
      dir = sentenceSet.ossDir
    }
  }

  // 生成 带hash的mp3 文件名, 并去掉标点, 空格转下划线
  const mp3Filename = getMp3Filename(sentence)

  const safeDir = typeof dir === 'string' && dir.trim() !== '' ? dir.trim().replace(/^\/|\/$/g, '') : ''
  const objectKey = safeDir ? `${safeDir}/${mp3Filename}` : mp3Filename

  try {
    const client = createOssClient()
    const url = client.signatureUrl(objectKey, {
      expires: parseInt(process.env.OSS_EXPIRES || '3600', 10),
    })

    return NextResponse.json({ url }, { status: 200 })
  } catch (err) {
    console.error('OSS signature generation error:', err)
    return NextResponse.json({ error: 'Failed to generate signed URL' }, { status: 500 })
  }
}
