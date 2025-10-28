import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { v4 as uuidv4 } from 'uuid'
import { generateUserProfile } from '@/lib/generateUserProfile'
import { prisma } from '@/lib/prisma'
import { getWechatAccessToken, getWechatUserInfo } from '@/lib/wechat'

export async function GET(req: Request) {
  try {
    // 解析 UA 与 IP，用于记录设备与大致位置
    const ua = req.headers.get('user-agent') || ''
    const ipRaw = req.headers.get('x-forwarded-for') || ''
    const ipFromHeader = typeof ipRaw === 'string' ? ipRaw.split(',')[0].trim() : ''
    // 优先通过 ipify 获取公网 IP，失败则回退到请求头
    let ip = ipFromHeader
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 2500)
      const ipResp = await fetch('https://api.ipify.org/?format=json', { cache: 'no-store', signal: controller.signal })
      clearTimeout(timeoutId)
      if (ipResp.ok) {
        const data: any = await ipResp.json().catch(() => ({}))
        if (data && typeof data.ip === 'string' && data.ip) {
          ip = data.ip
        }
      }
    } catch {
      ip = ipFromHeader
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
          const baseUrl = 'http://gwgp-gskkegngtuu.n.bdcloudapi.com/ip/city/query'
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

    // 设置登录态 cookie
    const cookieStore = await cookies()
    cookieStore.set('userId', user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 // 30 days
    })

    // 重定向到首页或成功页面
    const baseUrl = process.env.NEXTAUTH_URL || new URL(req.url).origin;

    // 检查是否来自iframe（通过referer或其他方式判断）
    const referer = req.headers.get('referer');
    const isFromIframe = referer && referer.includes(baseUrl);

    console.log('重定向信息:', { baseUrl, referer, isFromIframe });

    if (isFromIframe) {
      // 如果来自iframe，重定向到成功页面
      return NextResponse.redirect(new URL('/wechat-login-success', baseUrl));
    } else {
      // 否则直接重定向到首页
      return NextResponse.redirect(new URL('/', baseUrl));
    }
  } catch (error) {
    console.error('微信登录回调失败:', error)
    return NextResponse.json({ error: '登录失败' }, { status: 500 })
  }
}
