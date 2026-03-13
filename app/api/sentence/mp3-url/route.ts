import { NextResponse } from "next/server";
import { getMp3Filename, getMp3FilenameWithVoice } from "@/lib/getMp3Filename";
import { prisma } from "@/lib/prisma";
import { createOssClient } from '@/lib/oss'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const sentence = searchParams.get('sentence')
  const sentenceSetSlug = searchParams.get('sentenceSet')
  const voiceSuffix = searchParams.get('voiceSuffix') || ''

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

  // 生成 带hash的mp3 文件名
  const mp3Filename = voiceSuffix
    ? getMp3FilenameWithVoice(sentence, voiceSuffix)
    : getMp3Filename(sentence)

  const safeDir = typeof dir === 'string' && dir.trim() !== '' ? dir.trim().replace(/^\/|\/$/g, '') : ''
  const objectKey = safeDir ? `${safeDir}/${mp3Filename}` : mp3Filename

  try {
    const client = createOssClient()

    // 如果有 voiceSuffix，先检查文件是否存在
    if (voiceSuffix) {
      try {
        await client.head(objectKey)
      } catch (headErr: unknown) {
        const error = headErr as { code?: string; status?: number }
        if (error.code === 'NoSuchKey' || error.status === 404) {
          return NextResponse.json({ url: '', needGenerate: true }, { status: 200 })
        }
        throw headErr
      }
    }

    const url = client.signatureUrl(objectKey, {
      expires: parseInt(process.env.OSS_EXPIRES || '3600', 10),
    })

    return NextResponse.json({ url }, { status: 200 })
  } catch (err) {
    console.error('OSS signature generation error:', err)
    return NextResponse.json({ error: 'Failed to generate signed URL' }, { status: 500 })
  }
}
