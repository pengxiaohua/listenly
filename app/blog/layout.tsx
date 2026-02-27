import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '英语学习博客 - 听力口语提升技巧与备考攻略',
  description: '分享英语听力训练方法、影子跟读技巧、四六级/雅思/托福备考攻略等实用英语学习干货。帮助你科学高效地提升英语水平。',
  keywords: [
    '英语学习博客', '英语听力技巧', '影子跟读方法', '四六级备考',
    '雅思听力', '托福听力', '英语口语训练', '背单词方法'
  ],
  openGraph: {
    title: '英语学习博客 - Listenly',
    description: '实用英语学习干货，听力口语提升技巧与备考攻略。',
    url: 'https://listenly.cn/blog',
    type: 'website',
  },
}

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
