import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Listenly 会员 - 解锁英语听力口语训练课程',
  description: '开通 Listenly 会员，解锁更多英语单词、句子听写、影子跟读和视频学习课程。',
  alternates: {
    canonical: 'https://listenly.cn/vip',
  },
  openGraph: {
    title: 'Listenly 会员',
    description: '解锁更多英语听力、口语、词汇和视频学习课程。',
    url: 'https://listenly.cn/vip',
    type: 'website',
  },
}

export default function VipLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
