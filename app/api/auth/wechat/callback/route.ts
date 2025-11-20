import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { generateUserProfile } from '@/lib/generateUserProfile'
import { prisma } from '@/lib/prisma'
import { getWechatAccessToken, getWechatUserInfo } from '@/lib/wechat'

export async function GET(req: Request) {
  try {
    // 解析 UA 与 IP，用于记录设备与大致位置
    const ua = req.headers.get('user-agent') || ''
    // 1. 尝试从请求头获取用户真实 IP (X-Forwarded-For 通常包含经过代理的 IP 链，第一个为真实 IP)
    let ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      ''

    // 2. 如果是本地开发环境或未获取到 IP，尝试通过 ipify 获取当前机器公网 IP (方便本地测试)
    // 注意：在生产环境，ipify 返回的是服务器 IP，不代表用户位置，但如果没有更好选择，也可以作为兜底
    const isPrivateOrEmpty = !ip ||
      ip === '::1' ||
      ip.startsWith('127.') ||
      ip.startsWith('10.') ||
      ip.startsWith('192.168.') ||
      ip.startsWith('172.') // 简化判断

    if (isPrivateOrEmpty) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 2500)
        const ipResp = await fetch('https://api.ipify.org/?format=json', { signal: controller.signal })
        clearTimeout(timeoutId)
        if (ipResp.ok) {
          const data = (await ipResp.json().catch(() => ({}))) as unknown
          const ipField = (data as { ip?: unknown }).ip
          if (typeof ipField === 'string' && ipField) {
            ip = ipField
          }
        }
      } catch {
        // ipify 失败，保持 ip 原值
      }
    }
    const deviceOS = /iphone|ipad|ipod|ios/i.test(ua) ? 'iOS'
      : /android/i.test(ua) ? 'Android'
      : /mac os x|macintosh/i.test(ua) ? 'Mac'
      : /windows/i.test(ua) ? 'Windows'
      : /linux/i.test(ua) ? 'Linux'
      : 'Unknown'
    let location: string | null = null
    try {
      if (ip && !ip.startsWith('127.') && !ip.startsWith('10.') && !ip.startsWith('192.168.') && !ip.startsWith('172.16.') && !ip.startsWith('172.17.') && !ip.startsWith('172.18.') && !ip.startsWith('172.19.') && !ip.startsWith('172.2') && !ip.startsWith('::1')) {
        // 尝试使用公共 IP 定位服务（无密钥），失败则忽略
        const appCode = process.env.IP_LOCATION_APPCODE
        console.log('appCode:', appCode)
        console.log('ip:', ip)
        if (appCode) {
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 2500)
          const baseUrl = 'https://gwgp-gskkegngtuu.n.bdcloudapi.com/ip/city/query'
          const qs = new URLSearchParams({ ip })
          const resp = await fetch(`${baseUrl}?${qs.toString()}`,
            {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json;charset=UTF-8',
                'X-Bce-Signature': `AppCode/${appCode}`,
              },
              cache: 'no-store',
              signal: controller.signal,
            })
          clearTimeout(timeoutId)
          if (resp.ok) {
            type BaiDuIpCityResponse = {
              code?: number
              success?: boolean
              data?: { result?: { prov?: string; province?: string; city?: string } }
            }
            const jd = await resp.json() as BaiDuIpCityResponse
            const ok = (jd?.code === 200) || jd?.success === true
            if (ok) {
              const result = jd?.data?.result || {}
              const prov = result.prov || result.province || ''
              const city = result.city || ''
              if (prov || city) {
                location = `${prov || ''}${prov && city ? '-' : ''}${city || ''}` || null
              }
            }
          }
        }
      }
    } catch {
      location = ip || '';
    }
    const { searchParams } = new URL(req.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')

    console.log('微信回调请求详情:')
    console.log('URL:', req.url)
    console.log('code:', code)
    console.log('state:', state)

    if (!code) {
      console.error('微信回调缺少授权码')
      return NextResponse.json({ error: '缺少授权码' }, { status: 400 })
    }

    // 获取访问令牌
    console.log('准备获取微信访问令牌...')
    const tokenData = await getWechatAccessToken(code)
    console.log('获取到的token数据:', tokenData)

    // 获取用户信息
    const userInfo = await getWechatUserInfo(tokenData.access_token, tokenData.openid)
    console.log({userInfo})
    // 查找或创建用户
    let user = await prisma.user.findUnique({
      where: { wechatOpenId: userInfo.openid }
    })

    if (!user) {
      // 创建新用户
      user = await prisma.user.create({
        data: {
          id: uuidv4(),
          wechatOpenId: userInfo.openid,
          userName: userInfo.nickname || generateUserProfile().userName,
          avatar: userInfo.headimgurl || generateUserProfile().avatar,
          createdAt: new Date(),
          lastLogin: new Date(),
          deviceOS,
          location,
        }
      })
    } else {
      // 更新最后登录时间，但不覆盖用户自定义的头像
      await prisma.user.update({
        where: { id: user.id },
        data: {
          lastLogin: new Date(),
          deviceOS,
          location,
        }
      })
    }

    // 重定向到首页或成功页面
    const baseUrl = process.env.NEXTAUTH_URL || new URL(req.url).origin;

    // 检查是否来自iframe（通过referer或其他方式判断）
    const referer = req.headers.get('referer');
    const isFromIframe = referer && referer.includes(baseUrl);

    console.log('重定向信息:', { baseUrl, referer, isFromIframe });

    const redirectUrl = isFromIframe ? new URL('/wechat-login-success', baseUrl) : new URL('/', baseUrl)
    const response = NextResponse.redirect(redirectUrl)

    // 在响应对象上设置登录态 cookie，确保随重定向一并下发
    const isProd = process.env.NODE_ENV === 'production'
    const cookieDomain = process.env.COOKIE_DOMAIN // 例如：.listenly.cn（可选，不配置则使用当前主机）
    response.cookies.set('userId', user.id, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
      ...(cookieDomain ? { domain: cookieDomain } : {}),
    })

    return response
  } catch (error) {
    console.error('微信登录回调失败:', error)
    return NextResponse.json({ error: '登录失败' }, { status: 500 })
  }
}
