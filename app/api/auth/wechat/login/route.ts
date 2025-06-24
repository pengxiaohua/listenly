import { NextResponse } from 'next/server'
import { generateWechatAuthUrl } from '@/lib/wechat'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const redirect_uri = searchParams.get('redirect_uri') || `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/auth/wechat/callback`

    console.log('微信登录请求详情:')
    console.log('NEXTAUTH_URL:', process.env.NEXTAUTH_URL)
    console.log('计算出的回调地址:', redirect_uri)

    // 生成随机state用于防止CSRF攻击
    const state = Math.random().toString(36).substring(2, 15)

    // 构建微信授权URL
    const authUrl = generateWechatAuthUrl(redirect_uri, state)

    console.log('生成的微信授权URL:', authUrl)

    return NextResponse.json({
      authUrl,
      state
    })
  } catch (error) {
    console.error('生成微信登录URL失败:', error)
    return NextResponse.json({ error: '生成登录链接失败' }, { status: 500 })
  }
}
