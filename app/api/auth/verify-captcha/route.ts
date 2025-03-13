import { NextResponse } from 'next/server'
import { VerifyIntelligentCaptcha } from '@alicloud/captcha20230305'
import Client from '@alicloud/captcha20230305'
import * as $OpenApi from '@alicloud/openapi-client'

// 创建客户端
const createClient = () => {
  const config = new $OpenApi.Config({
    accessKeyId: process.env.ALIYUN_ACCESS_KEY_ID!,
    accessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET!,
    endpoint: 'captcha.cn-hangzhou.aliyuncs.com',  // 接入地域节点
  })
  return new Client(config)
}

export async function POST(req: Request) {
  try {
    const { captchaVerifyParam } = await req.json()
    
    const client = createClient()
    const verifyRequest = new VerifyIntelligentCaptcha({
      captchaVerifyParam,
      sceneId: process.env.NEXT_PUBLIC_ALIYUN_CAPTCHA_SCENE_ID!,
    })

    const result = await client.verifyIntelligentCaptcha(verifyRequest)

    if (result.body.code === '200') {
      return NextResponse.json({
        captchaVerifyResult: true,
        success: true
      })
    } else {
      return NextResponse.json({
        captchaVerifyResult: false,
        success: false,
        message: result.body.msg
      }, { status: 400 })
    }

  } catch (error) {
    console.error('验证码验证失败:', error)
    return NextResponse.json({
      captchaVerifyResult: false,
      success: false,
      message: '验证失败'
    }, { status: 500 })
  }
} 