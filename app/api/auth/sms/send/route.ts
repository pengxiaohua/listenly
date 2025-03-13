import { NextResponse } from 'next/server'
import { PrismaClient } from "@prisma/client"
import Dysmsapi20170525, * as $Dysmsapi20170525 from '@alicloud/dysmsapi20170525'
import * as $OpenApi from '@alicloud/openapi-client'
import { randomInt } from 'crypto'

const prisma = new PrismaClient()

const ACCESS_KEY_ID = process.env.ALIYUN_ACCESS_KEY_ID!
const ACCESS_KEY_SECRET = process.env.ALIYUN_ACCESS_KEY_SECRET!
const SIGN_NAME = process.env.ALIYUN_SMS_SIGN_NAME!
const TEMPLATE_CODE = process.env.ALIYUN_SMS_TEMPLATE_CODE!

const client = createClient()

function createClient(): Dysmsapi20170525 {
  const config = new $OpenApi.Config({
    accessKeyId: ACCESS_KEY_ID,
    accessKeySecret: ACCESS_KEY_SECRET,
  })
  config.endpoint = 'dysmsapi.aliyuncs.com'
  return new Dysmsapi20170525(config)
}

export async function POST(req: Request) {
  try {
    const { phone, sessionId, sig, token, scene } = await req.json()

    // 验证滑动验证码
    const verifyRes = await fetch(
      'http://cf.aliyun.com/nvc/nvcCheckNC.jsonp?' + new URLSearchParams({
        sessionId,
        sig,
        token,
        scene
      })
    )
    const verifyData = await verifyRes.json()
    if (verifyData.result.code !== 100) {
      return NextResponse.json({ error: '滑动验证失败' }, { status: 400 })
    }

    // 生成6位随机验证码
    const code = randomInt(100000, 999999).toString()

    // 发送短信
    const sendSmsRequest = new $Dysmsapi20170525.SendSmsRequest({
      phoneNumbers: phone,
      signName: SIGN_NAME,
      templateCode: TEMPLATE_CODE,
      templateParam: `{"code":"${code}"}`
    })

    const result = await client.sendSms(sendSmsRequest)

    if (result.body.code !== 'OK') {
      return NextResponse.json({ error: '短信发送失败' }, { status: 500 })
    }

    // 保存验证码到数据库
    const EXPIRE_MINUTES = 5
    await prisma.smsCode.upsert({
      where: { phone },
      update: {
        code,
        expiresAt: new Date(Date.now() + EXPIRE_MINUTES * 60 * 1000)
      },
      create: {
        phone,
        code,
        expiresAt: new Date(Date.now() + EXPIRE_MINUTES * 60 * 1000)
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('发送短信验证码失败:', error)
    return NextResponse.json({ error: '发送失败' }, { status: 500 })
  }
} 