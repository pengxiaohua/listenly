import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://listenly.cn'),
  title: {
    template: '%s | Listenly 英语听力口语训练',
    default: 'Listenly - 在线英语单词拼写_句子听写_影子跟读训练',
  },
  description: 'Listenly提供雅思、托福、四六级、考研、KET/PET及人教版中小学英语词汇拼写、新概念英语句子听写及影子跟读训练。免费在线英语学习工具，帮助提升英语听力、口语和词汇量。',
  keywords: [
    '英语听写', '在线背单词', '影子跟读', '英语口语训练',
    '雅思词汇', '托福词汇', '四六级单词', '考研英语' , '考研词汇', '高考词汇', '人教版中小学英语', '高考听力真题', '四六级听力真题', '雅思听力真题', '老友记',
    '新概念英语', 'KET', 'PET', '英语听力训练', 'Listenly'
  ],
  authors: [{ name: 'Listenly Team' }],
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: 'Listenly - 专业的在线英语听力口语训练平台',
    description: '每日听力训练，英语水平飞跃。涵盖中小学至出国留学全阶段英语学习资源。',
    url: 'https://listenly.cn',
    siteName: 'Listenly',
    locale: 'zh_CN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Listenly - 在线英语听力口语训练',
    description: '单词拼写 | 句子听写 | 影子跟读',
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
      >
        <Providers>
          {children}
        </Providers>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "WebSite",
                  "name": "Listenly",
                  "url": "https://listenly.cn",
                  "potentialAction": {
                    "@type": "SearchAction",
                    "target": "https://listenly.cn/word?name={search_term_string}",
                    "query-input": "required name=search_term_string"
                  }
                },
                {
                  "@type": "EducationalApplication",
                  "name": "Listenly",
                  "operatingSystem": "Web Browser",
                  "applicationCategory": "LanguageLearning",
                  "offers": {
                    "@type": "Offer",
                    "price": "0",
                    "priceCurrency": "CNY"
                  },
                  "description": "提供雅思、托福、四六级、考研及中小学英语词汇拼写、句子听写及影子跟读训练。"
                }
              ]
            })
          }}
        />
      </body>
    </html>
  );
}
