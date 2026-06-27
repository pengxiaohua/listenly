import { Suspense } from 'react'
import ShadowingClientPage from './ShadowingClientPage'
import PublicSeoSection from '@/components/common/PublicSeoSection'

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

const practiceSteps = [
  {
    name: '盲听跟读',
    description: '先不看文本，跟着音频模仿节奏和语调，训练声音反应速度。',
  },
  {
    name: '对照文本',
    description: '看英文原文和中文释义，修正漏读、吞音和重音位置。',
  },
  {
    name: 'AI 评分复盘',
    description: '根据准确度、流利度和完整度评分，针对低分单词重新练习。',
  },
]

const faqs = [
  {
    question: '影子跟读适合练听力还是口语？',
    answer: '影子跟读同时训练听力和口语。听力侧重快速识别声音，口语侧重模仿语音、节奏、重音和语调。',
  },
  {
    question: 'Listenly 的跟读评分看哪些维度？',
    answer: 'Listenly 会从准确度、流利度和完整度等维度评估跟读表现，帮助学习者定位发音和节奏问题。',
  },
  {
    question: '影子跟读每天练多久比较合适？',
    answer: '建议每天 10-20 分钟，选择难度适中的材料反复跟读，比一次练很久但不复盘更有效。',
  },
]

async function shouldShowSeoIntro(searchParams?: PageProps['searchParams']) {
  const params = await searchParams
  return !params?.set && !params?.group && !params?.groupId && !params?.id
}

export default async function ShadowingPage({ searchParams }: PageProps) {
  const showSeoIntro = await shouldShowSeoIntro(searchParams)

  return (
    <>
      <Suspense fallback={<div className="py-12 text-center text-slate-500">加载练习工具...</div>}>
        <ShadowingClientPage />
      </Suspense>

      {showSeoIntro && (
        <PublicSeoSection>
        <section className="bg-white border-t border-slate-200">
          <div className="mx-auto max-w-6xl px-4 py-10 md:py-14">
            <p className="text-sm font-medium text-emerald-600">Listenly Shadowing</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">
              英语影子跟读与 AI 口语发音评分
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600 md:text-lg">
              影子跟读是把听力输入和口语输出连在一起的训练方法。Listenly 提供逐句音频、跟读录音、AI 发音评分和分组练习，帮助你改善发音准确度、表达流利度和整句完整度。
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {practiceSteps.map((step, index) => (
                <div key={step.name} className="rounded-lg border border-slate-200 bg-slate-50 p-5">
                  <p className="text-sm font-semibold text-emerald-600">Step {index + 1}</p>
                  <h2 className="mt-2 text-lg font-semibold text-slate-950">{step.name}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{step.description}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border border-slate-200 p-5">
                <h2 className="text-lg font-semibold text-slate-950">准确度</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">检查单词发音是否接近原音，适合纠正常见音素和重音问题。</p>
              </div>
              <div className="rounded-lg border border-slate-200 p-5">
                <h2 className="text-lg font-semibold text-slate-950">流利度</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">关注停顿、节奏和连贯性，帮助跟读更接近自然英语表达。</p>
              </div>
              <div className="rounded-lg border border-slate-200 p-5">
                <h2 className="text-lg font-semibold text-slate-950">完整度</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">识别漏读和跳词，让每一句练习都能完整复现原文。</p>
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
      )}

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@graph': [
              {
                '@type': 'WebPage',
                name: '英语影子跟读与 AI 口语发音评分',
                url: 'https://listenly.cn/shadowing',
                inLanguage: 'zh-CN',
                description: 'Listenly 提供英语影子跟读、录音评测和 AI 发音评分训练。',
              },
              {
                '@type': 'Course',
                name: '英语影子跟读口语训练',
                provider: {
                  '@type': 'Organization',
                  name: 'Listenly',
                  url: 'https://listenly.cn',
                },
                teaches: ['英语口语', '英语发音', '影子跟读', '听说训练'],
                educationalLevel: 'A1-C1',
                inLanguage: 'zh-CN',
              },
              {
                '@type': 'HowTo',
                name: '如何使用影子跟读训练英语口语',
                step: practiceSteps.map((step, index) => ({
                  '@type': 'HowToStep',
                  position: index + 1,
                  name: step.name,
                  text: step.description,
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
