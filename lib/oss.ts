import OSS from 'ali-oss'

const DEFAULT_OSS_EXPIRES = parseInt(process.env.OSS_EXPIRES || '3600', 10)

export function createOssClient() {
  return new OSS({
    region: process.env.OSS_REGION!,
    accessKeyId: process.env.OSS_ACCESS_KEY_ID!,
    accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET!,
    bucket: process.env.OSS_BUCKET_NAME!,
    secure: true,
  })
}

export function getSignedOssUrl(client: OSS, value?: string | null) {
  if (!value) {
    return value
  }

  if (/^https?:\/\//i.test(value)) {
    return value
  }

  try {
    return client.signatureUrl(value, { expires: DEFAULT_OSS_EXPIRES })
  } catch (error) {
    console.error('生成 OSS 签名 URL 失败:', error)
    return value
  }
}

/**
 * 将用户头像字段解析为可访问 URL。
 * - OSS key（avatars/...）：生成签名 URL
 * - 旧格式完整 OSS URL：提取 key 后签名
 * - 其他（dicebear data URI / 微信头像 http URL）：原样返回
 */
export function resolveAvatarUrl(client: OSS, avatar?: string | null) {
  if (!avatar) return avatar

  if (avatar.startsWith('avatars/')) {
    try {
      return client.signatureUrl(avatar, { expires: DEFAULT_OSS_EXPIRES })
    } catch (error) {
      console.error('生成头像签名URL失败:', error)
      return avatar
    }
  }

  if (avatar.includes('listenly.oss-cn-hangzhou.aliyuncs.com/avatars/')) {
    try {
      const parts = avatar.split('listenly.oss-cn-hangzhou.aliyuncs.com/')
      if (parts.length > 1) {
        const ossKey = parts[1].split('?')[0]
        return client.signatureUrl(ossKey, { expires: DEFAULT_OSS_EXPIRES })
      }
    } catch (error) {
      console.error('处理旧格式头像URL失败:', error)
      return avatar
    }
  }

  return avatar
}

