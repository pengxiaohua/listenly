import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '使用指南 - Listenly 英语听力口语训练',
  description: 'Listenly 使用指南，介绍单词拼写、句子听写、影子跟读、视频学习等功能的使用方法。',
  alternates: {
    canonical: 'https://listenly.cn/guide',
  },
  openGraph: {
    title: 'Listenly 使用指南',
    description: '快速了解 Listenly 单词、句子、跟读和视频学习功能。',
    url: 'https://listenly.cn/guide',
    type: 'website',
  },
}

export default function GuideLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
