import { MetadataRoute } from 'next'
import { getAllPosts } from '@/lib/blog'
import { prisma } from '@/lib/prisma'

const baseUrl = 'https://listenly.cn'
const siteUpdatedAt = new Date('2026-06-27')

export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // 静态页面
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: siteUpdatedAt,
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/word`,
      lastModified: siteUpdatedAt,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/sentence`,
      lastModified: siteUpdatedAt,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/shadowing`,
      lastModified: siteUpdatedAt,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/video`,
      lastModified: siteUpdatedAt,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: siteUpdatedAt,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/guide`,
      lastModified: siteUpdatedAt,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/vip`,
      lastModified: siteUpdatedAt,
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: siteUpdatedAt,
      changeFrequency: 'yearly',
      priority: 0.2,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: siteUpdatedAt,
      changeFrequency: 'yearly',
      priority: 0.2,
    },
  ]

  // 博客文章页面
  const posts = getAllPosts()
  const blogPages: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }))

  try {
    const videos = await prisma.video.findMany({
      where: { status: 'ACTIVE' },
      select: { uuid: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
      take: 500,
    })

    const videoPages: MetadataRoute.Sitemap = videos.map((video) => ({
      url: `${baseUrl}/video/${video.uuid}`,
      lastModified: video.updatedAt,
      changeFrequency: 'monthly' as const,
      priority: 0.65,
    }))

    return [...staticPages, ...blogPages, ...videoPages]
  } catch (error) {
    console.error('生成动态 sitemap 失败，已回退到静态页面:', error)
    return [...staticPages, ...blogPages]
  }
}
