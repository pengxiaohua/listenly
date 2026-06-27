import type { Metadata } from 'next'
import VideoClientPage from './VideoClientPage'
import PublicSeoSection from '@/components/common/PublicSeoSection'

export const metadata: Metadata = {
  title: '看视频学英语 - 英语短视频听力/跟读/听写训练',
  description: '精选 TED、Vlog、影视剧、科普、职场等英语视频，支持逐句字幕、关键短语、跟读和听写训练，在真实语境中提升英语听力和口语。',
  keywords: ['看视频学英语', '英语视频学习', '英语听力视频', 'TED学英语', '美剧学英语', '英语跟读', '英语听写'],
  alternates: {
    canonical: 'https://listenly.cn/video',
  },
  openGraph: {
    title: '看视频学英语 - Listenly',
    description: '用真实英语视频做逐句听力、跟读和听写训练。',
    url: 'https://listenly.cn/video',
    type: 'website',
  },
}

const categories = [
  'TED 演讲与公开表达',
  '影视剧和真实对话',
  '生活 Vlog 与日常口语',
  '职场商业英语',
  '科普和个人成长',
  '心理学、哲学与思辨表达',
]

const faqs = [
  {
    question: '看视频学英语为什么有效？',
    answer: '视频同时提供画面、声音、字幕和真实语境，能帮助学习者把词汇、表达和场景联系起来，比单独背单词更接近真实语言使用。',
  },
  {
    question: 'Listenly 视频学习支持哪些训练？',
    answer: 'Listenly 视频学习支持逐句字幕、关键短语理解、单句循环、跟读录音和听写练习，适合把泛看视频变成可复盘的精听训练。',
  },
  {
    question: '什么水平适合用视频练英语？',
    answer: 'A2 到 C2 学习者都可以使用视频训练。初级学习者适合短句和慢速材料，中高级学习者适合 TED、访谈、影视剧和专业主题内容。',
  },
]

export default function VideoPage() {
  return (
    <>
      <VideoClientPage />

      <PublicSeoSection>
      <section className="bg-white border-t border-slate-200">
        <div className="mx-auto max-w-6xl px-4 py-10 md:py-14">
          <p className="text-sm font-medium text-rose-600">Listenly Video Learning</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">
            看视频学英语：逐句听力、跟读和听写训练
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600 md:text-lg">
            Listenly 将英语视频拆成可练习的句子，配合字幕、关键短语、单句循环、跟读录音和听写输入，让 TED、Vlog、影视剧、科普和职场视频从“看过”变成真正“听懂、会说、能复用”。
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
              <h2 className="text-lg font-semibold text-slate-950">逐句精听</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">按句定位视频内容，反复播放听不清的部分，适合训练连读、弱读和真实语速。</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
              <h2 className="text-lg font-semibold text-slate-950">跟读录音</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">模仿视频原声的语调、节奏和停顿，用录音复盘口语输出。</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
              <h2 className="text-lg font-semibold text-slate-950">关键词复用</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">标记视频中的短语、搭配和表达方式，把真实语境中的内容沉淀为可复用表达。</p>
            </div>
          </div>

          <div className="mt-8">
            <h2 className="text-xl font-semibold text-slate-950">视频主题</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {categories.map((category) => (
                <span key={category} className="rounded-full border border-rose-100 bg-rose-50 px-3 py-1 text-sm text-rose-700">
                  {category}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {faqs.map((item) => (
              <div key={item.question} className="rounded-lg border border-slate-200 p-5">
                <h2 className="text-base font-semibold text-slate-950">{item.question}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      </PublicSeoSection>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@graph': [
              {
                '@type': 'WebPage',
                name: '看视频学英语',
                url: 'https://listenly.cn/video',
                inLanguage: 'zh-CN',
                description: 'Listenly 提供英语视频逐句听力、跟读和听写训练。',
              },
              {
                '@type': 'Course',
                name: '英语视频听力与跟读训练',
                provider: {
                  '@type': 'Organization',
                  name: 'Listenly',
                  url: 'https://listenly.cn',
                },
                teaches: ['英语听力', '英语口语', '英语视频学习', '真实语境表达'],
                educationalLevel: 'A2-C2',
                inLanguage: 'zh-CN',
              },
              {
                '@type': 'ItemList',
                name: 'Listenly 视频学习主题',
                itemListElement: categories.map((category, index) => ({
                  '@type': 'ListItem',
                  position: index + 1,
                  name: category,
                })),
              },
              {
                '@type': 'FAQPage',
                mainEntity: faqs.map((item) => ({
                  '@type': 'Question',
                  name: item.question,
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: item.answer,
                  },
                })),
              },
            ],
          }),
        }}
      />

    </>
  )
}
