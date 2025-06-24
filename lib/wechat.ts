export interface WechatUserInfo {
  openid: string
  nickname: string
  sex: number
  province: string
  city: string
  country: string
  headimgurl: string
  privilege: string[]
  unionid?: string
}

export interface WechatTokenResponse {
  access_token: string
  expires_in: number
  refresh_token: string
  openid: string
  scope: string
  unionid?: string
  errcode?: number
  errmsg?: string
}

/**
 * 获取微信访问令牌
 */
export async function getWechatAccessToken(code: string): Promise<WechatTokenResponse> {
  const url = `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${process.env.WECHAT_APPID}&secret=${process.env.WECHAT_SECRET}&code=${code}&grant_type=authorization_code`

  const response = await fetch(url)
  const data = await response.json()
  console.log({data})
  if (data.errcode) {
    throw new Error(`微信API错误: ${data.errmsg} (${data.errcode})`)
  }

  return data
}

/**
 * 获取微信用户信息
 */
export async function getWechatUserInfo(accessToken: string, openid: string): Promise<WechatUserInfo> {
  const url = `https://api.weixin.qq.com/sns/userinfo?access_token=${accessToken}&openid=${openid}`

  const response = await fetch(url)
  const data = await response.json()

  if (data.errcode) {
    throw new Error(`微信API错误: ${data.errmsg} (${data.errcode})`)
  }

  return data
}

/**
 * 生成微信授权URL
 */
export function generateWechatAuthUrl(redirectUri: string, state?: string): string {
  const params = new URLSearchParams({
    appid: process.env.WECHAT_APPID!,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'snsapi_login',
    state: state || Math.random().toString(36).substring(2, 15),
  })

  return `https://open.weixin.qq.com/connect/qrconnect?${params.toString()}#wechat_redirect`
}
