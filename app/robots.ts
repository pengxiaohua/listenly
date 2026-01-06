import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/my/'], // 禁止抓取后台和用户个人中心
    },
    sitemap: 'https://listenly.cn/sitemap.xml',
  }
}
