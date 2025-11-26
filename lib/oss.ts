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

