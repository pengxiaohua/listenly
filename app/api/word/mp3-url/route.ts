import { NextResponse } from "next/server";
import { getMp3Filename } from "@/lib/getMp3Filename";
import { prisma } from "@/lib/prisma";
import { createOssClient } from '@/lib/oss'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const word = searchParams.get('word')
  const wordSetSlug = searchParams.get('wordSet')

  if (!word || typeof word !== 'string') {
    return NextResponse.json({ error: 'Missing or invalid sentence' }, { status: 400 })
  }

  let dir = searchParams.get('dir')
  if (!dir && wordSetSlug) {
    const wordSet = await prisma.wordSet.findUnique({
      where: { slug: wordSetSlug },
      select: { ossDir: true }
    })

    if (wordSet?.ossDir) {
      dir = wordSet.ossDir
    }
  }

  // 生成 带hash的mp3 文件名, 并去掉标点, 空格转下划线
  const mp3Filename = getMp3Filename(word)

  const safeDir = typeof dir === 'string' && dir.trim() !== '' ? dir.trim().replace(/^\/|\/$/g, '') : ''
  const objectKey = safeDir ? `${safeDir}/${mp3Filename}` : mp3Filename

  try {
    const client = createOssClient()
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
