import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { text, mode = 'E', voiceUrl, audioFormat = 'mp3', deviceId, scoreCoefficient } = await req.json()
    if (!text || !voiceUrl) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 })
    }

    const appKey = process.env.SHADOWING_EVALUATE_KEY
    const appSecret = process.env.SHADOWING_EVALUATE_SECRET
    if (!appKey || !appSecret) {
      return NextResponse.json({ error: '评测服务配置缺失' }, { status: 500 })
    }

    const url = `https://edu.hivoice.cn/eval/${audioFormat}`
    const sessionId = crypto.randomUUID()
    console.log({sessionId})
    const headers: Record<string, string> = {
      'session-id': sessionId,
      'appkey': `${appKey}@${appSecret}`,
      'Wrap-Create-Time': true,
      'Content-Type': 'application/json',
    }
    if (deviceId) headers['device-id'] = String(deviceId)
    if (scoreCoefficient) headers['score-coefficient'] = String(scoreCoefficient)
    headers['X-EngineType'] = 'oral.zh_CH' // 中文需设置；英文评测也可省略
    headers['text-type'] = 'json'

    const body = {
      text,
      mode,
      voiceUrl,
    }

    const resp = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })

    const result = await resp.json()
    if (!resp.ok) {
      return NextResponse.json({ success: false, error: result || '评测失败' }, { status: resp.status })
    }

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('评测接口错误:', error)
    return NextResponse.json({ error: '评测服务异常' }, { status: 500 })
  }
}


