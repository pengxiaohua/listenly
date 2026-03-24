import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { createOssClient } from '@/lib/oss'
import { getMp3FilenameWithVoice } from '@/lib/getMp3Filename'
import { isPro } from '@/lib/membership'

// voice_id 到后缀和数据库字段的映射
const VOICE_MAP: Record<string, { suffix: string; field: string }> = {
  English_expressive_narrator: { suffix: '_male_uk', field: 'ossKeyMaleUk' },
  English_compelling_lady1: { suffix: '_female_uk', field: 'ossKeyFemaleUk' },
  English_magnetic_voiced_man: { suffix: '_male_us', field: 'ossKeyMaleUs' },
  English_Upbeat_Woman: { suffix: '_female_us', field: 'ossKeyFemaleUs' },
}

type ContentType = 'word' | 'sentence' | 'shadowing'

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const userId = cookieStore.get('userId')?.value
  if (!userId) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }

  const body = await req.json()
  const { text, voiceId, type, targetId, ossDir } = body as {
    text: string
    voiceId: string
    type: ContentType
    targetId: string | number
    ossDir: string
  }

  if (!text || !voiceId || !type || !targetId || !ossDir) {
    return NextResponse.json({ error: '参数不完整' }, { status: 400 })
  }

  const voiceInfo = VOICE_MAP[voiceId]
  if (!voiceInfo) {
    return NextResponse.json({ error: '无效的 voiceId' }, { status: 400 })
  }

  // 会员校验：非会员不能使用非默认发音
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { membershipExpiresAt: true }
  })
  if (!isPro(user?.membershipExpiresAt)) {
    return NextResponse.json({ error: '需要会员才能使用该发音' }, { status: 403 })
  }

  // 生成带后缀的文件名和 ossKey
  const mp3Filename = getMp3FilenameWithVoice(text, voiceInfo.suffix)
  const safeDir = ossDir.trim().replace(/^\/|\/$/g, '')
  const objectKey = safeDir ? `${safeDir}/${mp3Filename}` : mp3Filename

  try {
    const client = createOssClient()

    // 先检查 OSS 上是否已存在该文件
    try {
      await client.head(objectKey)
      const url = client.signatureUrl(objectKey, {
        expires: parseInt(process.env.OSS_EXPIRES || '3600', 10),
      })
      return NextResponse.json({ url, ossKey: objectKey, cached: true })
    } catch (headErr: unknown) {
      const error = headErr as { code?: string; status?: number }
      if (error.code !== 'NoSuchKey' && error.status !== 404) {
        throw headErr
      }
    }

    // 调用 MiniMax TTS HTTP 接口
    const apiSecret = process.env.MINIMAX_API_SECRET
    if (!apiSecret) {
      return NextResponse.json({ error: 'MiniMax API 未配置' }, { status: 500 })
    }

    const ttsRes = await fetch('https://api.minimaxi.com/v1/t2a_v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiSecret}`,
      },
      body: JSON.stringify({
        model: 'speech-2.8-turbo',
        text,
        stream: false,
        voice_setting: {
          voice_id: voiceId,
          speed: 1,
          vol: 1,
          pitch: 0,
          emotion: 'happy',
        },
        audio_setting: {
          sample_rate: 32000,
          bitrate: 128000,
          format: 'mp3',
          channel: 1,
        },
        subtitle_enable: false,
        language_boost: 'English',
      }),
    })

    if (!ttsRes.ok) {
      const errText = await ttsRes.text()
      console.error('MiniMax TTS 请求失败:', errText)
      return NextResponse.json({ error: 'TTS 请求失败' }, { status: 502 })
    }

    const ttsData = await ttsRes.json()

    if (ttsData.base_resp?.status_code !== 0) {
      console.error('MiniMax TTS 返回错误:', ttsData.base_resp)
      return NextResponse.json({ error: ttsData.base_resp?.status_msg || 'TTS 生成失败' }, { status: 502 })
    }

    const hexAudio = ttsData.data?.audio
    if (!hexAudio) {
      return NextResponse.json({ error: 'TTS 返回无音频数据' }, { status: 502 })
    }

    // hex 编码转 Buffer
    const audioBuffer = Buffer.from(hexAudio, 'hex')

    // 上传到 OSS
    await client.put(objectKey, audioBuffer, {
      headers: { 'Content-Type': 'audio/mpeg' },
    })

    // 更新数据库中对应记录的 oss_key 字段
    await updateOssKey(type, targetId, voiceInfo.field, objectKey)

    // 生成签名 URL
    const url = client.signatureUrl(objectKey, {
      expires: parseInt(process.env.OSS_EXPIRES || '3600', 10),
    })

    return NextResponse.json({ url, ossKey: objectKey, cached: false })
  } catch (err) {
    console.error('TTS 生成失败:', err)
    return NextResponse.json({ error: 'TTS 生成失败' }, { status: 500 })
  }
}

async function updateOssKey(type: ContentType, targetId: string | number, field: string, ossKey: string) {
  const data = { [field]: ossKey }

  switch (type) {
    case 'word':
      await prisma.word.update({ where: { id: String(targetId) }, data })
      break
    case 'sentence':
      await prisma.sentence.update({ where: { id: Number(targetId) }, data })
      break
    case 'shadowing':
      await prisma.shadowing.update({ where: { id: Number(targetId) }, data })
      break
  }
}
