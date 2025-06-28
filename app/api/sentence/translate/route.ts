import { NextRequest, NextResponse } from 'next/server'
import crypto from "crypto";
import { prisma } from '@/lib/prisma'

function truncate(q: string) {
  const len = q.length;
  if (len <= 20) return q;
  return q.substring(0, 10) + len + q.substring(len - 10, len);
}

function sha256(str: string) {
  return crypto.createHash("sha256").update(str).digest("hex");
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { text, sentenceId } = body

  if (!text || !sentenceId) {
    return NextResponse.json({ error: '参数缺失' }, { status: 400 })
  }

  try {
    // 先查找句子是否已有翻译
    const sentence = await prisma.sentence.findUnique({
      where: { id: sentenceId },
      select: { translation: true }
    })

    // 如果已有翻译，直接返回
    if (sentence?.translation) {
      return NextResponse.json({
        success: true,
        translation: sentence.translation
      })
    }

    // 准备有道翻译API所需参数
    const appKey = process.env.YOUDAO_APPKEY;
    const appSecret = process.env.YOUDAO_APPSECRET;

    if (!appKey || !appSecret) {
      return NextResponse.json({
        success: false,
        error: '翻译服务配置缺失'
      }, { status: 500 })
    }

    const salt = crypto.randomUUID();
    const curtime = Math.floor(Date.now() / 1000).toString();
    const input = truncate(text);
    const sign = sha256(appKey + input + salt + curtime + appSecret);

    // 调用有道翻译API
    const response = await fetch('https://openapi.youdao.com/api', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        q: text,
        from: 'en',
        to: 'zh-CHS',
        appKey,
        salt,
        sign,
        signType: 'v3',
        curtime
      })
    })

    const data = await response.json()

    if (data.errorCode === '0' && data.translation?.[0]) {
      const translation = data.translation[0]

      // 保存翻译结果到数据库
      await prisma.sentence.update({
        where: { id: sentenceId },
        data: { translation }
      })

      return NextResponse.json({
        success: true,
        translation
      })
    } else {
      return NextResponse.json({
        success: false,
        error: '翻译失败',
        details: data
      })
    }
  } catch (error) {
    console.error('翻译错误:', error)
    return NextResponse.json({
      success: false,
      error: '翻译服务异常'
    }, { status: 500 })
  }
}
