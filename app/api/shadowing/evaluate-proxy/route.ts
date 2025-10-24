import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const urlObj = new URL(req.url)
    const audioFormat = urlObj.searchParams.get('format') || 'wav'
    const appKey = process.env.SHADOWING_EVALUATE_KEY
    const appSecret = process.env.SHADOWING_EVALUATE_SECRET
    if (!appKey || !appSecret) {
      return NextResponse.json({ error: '评测服务配置缺失' }, { status: 500 })
    }

    const formData = await req.formData()
    // 必要字段: text, mode，以及 voice(文件) 或 voiceurl(外链)
    if (!formData.get('text') || !formData.get('mode') || (!formData.get('voice') && !formData.get('voiceurl'))) {
      return NextResponse.json({ error: '缺少必要字段: text/mode/voice(或voiceurl)' }, { status: 400 })
    }

    // 文档要求：wav 与 pcm 的请求后缀均为 pcm
    const mappedFormat = (audioFormat === 'wav' || audioFormat === 'pcm') ? 'pcm' : audioFormat
    const forwardUrl = `https://edu.hivoice.cn/eval/${mappedFormat}`
    const headers: Record<string, string> = {
      'session-id': crypto.randomUUID(),
      'appkey': `${appKey}@${appSecret}`,
      'accept': 'application/json',
      'Wrap-Create-Time': 'true',
    }

    // 复制构造一份表单用于转发，同时收集调试信息
    const forwardForm = new FormData()
    const mode = String(formData.get('mode') || '')
    const reqText = String(formData.get('text') || '')
    const repeat = formData.get('repeat')?.toString()
    const voiceurl = formData.get('voiceurl')?.toString()
    const voice = formData.get('voice') as File | null
    forwardForm.set('mode', mode)
    forwardForm.set('text', reqText)
    if (repeat) forwardForm.set('repeat', repeat)
    if (voiceurl) forwardForm.set('voiceurl', voiceurl)
    if (voice) forwardForm.set('voice', voice, voice.name || `audio.${audioFormat}`)

    const resp = await fetch(forwardUrl, {
      method: 'POST',
      headers,
      body: forwardForm,
    })

    const respText = await resp.text()
    return NextResponse.json({
      success: resp.ok,
      status: resp.status,
      body: respText,
      debug: {
        forwardUrl,
        headers,
        fields: {
          mode, text: reqText, repeat: repeat ?? null,
          voiceurl: voiceurl ?? null,
          voiceSize: voice ? voice.size : null,
        },
      },
    }, { status: resp.ok ? 200 : resp.status })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}


