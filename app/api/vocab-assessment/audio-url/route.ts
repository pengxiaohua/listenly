import { NextResponse } from 'next/server';
import { getMp3Filename } from '@/lib/getMp3Filename';
import { createOssClient } from '@/lib/oss';

/**
 * GET /api/vocab-assessment/audio-url?word=hello&level=a1
 * 生成词汇测评单词的 OSS 签名音频 URL
 * OSS 路径: words/cerf/{level}/{hash}_{slug}.mp3
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const word = searchParams.get('word');
  const level = searchParams.get('level')?.toLowerCase();

  if (!word || !level) {
    return NextResponse.json({ error: 'Missing word or level' }, { status: 400 });
  }

  const validLevels = ['a1', 'a2', 'b1', 'b2', 'c1', 'c2'];
  if (!validLevels.includes(level)) {
    return NextResponse.json({ error: 'Invalid CEFR level' }, { status: 400 });
  }

  const mp3Filename = getMp3Filename(word);
  const objectKey = `words/cerf/${level}/${mp3Filename}`;

  try {
    const client = createOssClient();

    // 检查文件是否存在
    try {
      await client.head(objectKey);
    } catch (headErr: unknown) {
      const error = headErr as { code?: string; status?: number };
      if (error.code === 'NoSuchKey' || error.status === 404) {
        return NextResponse.json({ url: '' }, { status: 200 });
      }
      throw headErr;
    }

    const url = client.signatureUrl(objectKey, {
      expires: parseInt(process.env.OSS_EXPIRES || '3600', 10),
    });

    return NextResponse.json({ url }, { status: 200 });
  } catch (err) {
    console.error('OSS signature generation error:', err);
    return NextResponse.json({ error: 'Failed to generate signed URL' }, { status: 500 });
  }
}
