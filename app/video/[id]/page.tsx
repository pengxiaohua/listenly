import { cache } from 'react'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import VideoDetailClientPage from './VideoDetailClientPage'

type PageProps = {
  params: Promise<{ id: string }>
}

const getVideo = cache(async (id: string) => {
  const isNumeric = /^\d+$/.test(id)
  return prisma.video.findFirst({
    where: isNumeric ? { id: parseInt(id, 10), status: 'ACTIVE' } : { uuid: id, status: 'ACTIVE' },
    select: {
      id: true,
      uuid: true,
      title: true,
      titleZh: true,
      author: true,
      description: true,
      category: true,
      level: true,
      duration: true,
      tags: true,
      coverImage: true,
      isPro: true,
      publishedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  })
})

function getVideoDescription(video: NonNullable<Awaited<ReturnType<typeof getVideo>>>) {
  return video.description || video.titleZh || `Listenly 英语视频学习：${video.title}。支持逐句字幕、跟读和听写训练。`
}

function getThumbnailUrl(coverImage?: string | null) {
  if (coverImage && /^https?:\/\//i.test(coverImage)) return coverImage
  return 'https://listenly.cn/images/logo.png'
}

function formatIsoDuration(seconds?: number | null) {
  if (!seconds || seconds <= 0) return undefined
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const rest = seconds % 60
  return `PT${hours ? `${hours}H` : ''}${minutes ? `${minutes}M` : ''}${rest ? `${rest}S` : ''}`
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const video = await getVideo(id)
  if (!video) {
    return {
      title: '视频未找到',
      robots: { index: false, follow: false },
    }
  }

  const title = video.titleZh ? `${video.titleZh} - ${video.title}` : `${video.title} - 英语视频学习`
  const description = getVideoDescription(video)
  const url = `https://listenly.cn/video/${video.uuid}`

  return {
    title,
    description,
    keywords: ['看视频学英语', '英语视频学习', '英语听力训练', '英语跟读', ...video.tags],
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description,
      url,
      type: 'article',
      images: [getThumbnailUrl(video.coverImage)],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [getThumbnailUrl(video.coverImage)],
    },
  }
}

export default async function VideoDetailPage({ params }: PageProps) {
  const { id } = await params
  const video = await getVideo(id)
  if (!video) notFound()

  const canonicalUrl = `https://listenly.cn/video/${video.uuid}`
  const description = getVideoDescription(video)
  const thumbnailUrl = getThumbnailUrl(video.coverImage)
  const uploadDate = (video.publishedAt || video.createdAt).toISOString()

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@graph': [
              {
                '@type': 'VideoObject',
                name: video.titleZh ? `${video.titleZh} - ${video.title}` : video.title,
                description,
                thumbnailUrl: [thumbnailUrl],
                uploadDate,
                dateModified: video.updatedAt.toISOString(),
                duration: formatIsoDuration(video.duration),
                inLanguage: 'en',
                isAccessibleForFree: !video.isPro,
                educationalLevel: video.level,
                genre: video.category,
                keywords: video.tags.join(', '),
                publisher: {
                  '@type': 'Organization',
                  name: 'Listenly',
                  url: 'https://listenly.cn',
                },
                mainEntityOfPage: {
                  '@type': 'WebPage',
                  '@id': canonicalUrl,
                },
              },
              {
                '@type': 'BreadcrumbList',
                itemListElement: [
                  { '@type': 'ListItem', position: 1, name: '首页', item: 'https://listenly.cn' },
                  { '@type': 'ListItem', position: 2, name: '视频学习', item: 'https://listenly.cn/video' },
                  { '@type': 'ListItem', position: 3, name: video.titleZh || video.title, item: canonicalUrl },
                ],
              },
            ],
          }),
        }}
      />
      <VideoDetailClientPage />
    </>
  )
}
