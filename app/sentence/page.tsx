import { Suspense } from 'react'
import SentenceClientPage from './SentenceClientPage'

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

const sentenceCourses = [
  { name: '新概念英语听写', level: 'A2-B2', description: '适合用经典课文训练完整句子听辨、拼写和语感。' },
  { name: '雅思听力真题训练', level: 'B1-C1', description: '适合备考雅思听力，训练长句、同义替换和场景表达。' },
  { name: '中小学英语教材听写', level: 'A1-B1', description: '适合校内同步复习，巩固课文句型和核心词汇。' },
  { name: '外企地道表达 1100 句', level: 'B1-C1', description: '适合提升真实职场沟通、邮件和会议表达理解。' },
]

const faqs = [
  {
    question: '英语句子听写主要训练什么能力？',
    answer: '句子听写主要训练精听、拼写、语块识别和语法感知，帮助学习者从单词级听力过渡到完整句子理解。',
  },
  {
    question: '句子听写适合每天练多久？',
    answer: '建议每天选择 10-20 个句子做精听，先完整听，再逐词输入，最后对照原文复盘没听出的连读、弱读和生词。',
  },
  {
    question: 'Listenly 句子听写有哪些材料？',
    answer: 'Listenly 句子听写覆盖新概念英语、雅思听力、中小学教材、地道表达等材料，并支持分组练习和复习。',
  },
]

async function shouldShowSeoIntro(searchParams?: PageProps['searchParams']) {
  const params = await searchParams
  return !params?.set && !params?.sentenceSet && !params?.slug && !params?.group && !params?.id
}

export default async function SentencePage({ searchParams }: PageProps) {
  const showSeoIntro = await shouldShowSeoIntro(searchParams)

  return (
    <>
      <Suspense fallback={<div className="py-12 text-center text-slate-500">加载练习工具...</div>}>
        <SentenceClientPage />
      </Suspense>

      {showSeoIntro && (
        <section className="bg-white border-t border-slate-200">
          <div className="mx-auto max-w-6xl px-4 py-10 md:py-14">
            <p className="text-sm font-medium text-purple-600">Listenly Sentence Dictation</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">
              英语句子听写与精听训练
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600 md:text-lg">
              句子听写适合解决“单词认识，但整句听不出来”的问题。Listenly 将英文材料拆成可重复练习的句子，帮助你逐句听辨、输入、核对和复盘，提升长句理解、拼写准确度和真实听力反应速度。
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-4">
              {sentenceCourses.map((course) => (
                <div key={course.name} className="rounded-lg border border-slate-200 bg-slate-50 p-5">
                  <h2 className="text-base font-semibold text-slate-950">{course.name}</h2>
                  <p className="mt-1 text-xs font-medium text-purple-600">{course.level}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{course.description}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border border-slate-200 p-5">
                <h2 className="text-lg font-semibold text-slate-950">第一步：完整听</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">先不看答案，完整听句子，判断自己能否抓住主干和关键词。</p>
              </div>
              <div className="rounded-lg border border-slate-200 p-5">
                <h2 className="text-lg font-semibold text-slate-950">第二步：逐词写</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">输入听到的每个词，系统会帮助你定位漏听、误听和拼写错误。</p>
              </div>
              <div className="rounded-lg border border-slate-200 p-5">
                <h2 className="text-lg font-semibold text-slate-950">第三步：复盘难点</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">重点复听连读、弱读、吞音和不熟悉表达，把听不出的句子纳入复习。</p>
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
      )}

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@graph': [
              {
                '@type': 'WebPage',
                name: '英语句子听写与精听训练',
                url: 'https://listenly.cn/sentence',
                inLanguage: 'zh-CN',
                description: 'Listenly 提供新概念英语、雅思听力、中小学教材等英语句子听写和精听训练。',
              },
              {
                '@type': 'Course',
                name: '英语句子听写精听训练',
                provider: {
                  '@type': 'Organization',
                  name: 'Listenly',
                  url: 'https://listenly.cn',
                },
                teaches: ['英语精听', '句子听写', '长句理解', '英语语感'],
                educationalLevel: 'A1-C1',
                inLanguage: 'zh-CN',
              },
              {
                '@type': 'ItemList',
                name: 'Listenly 句子听写材料类型',
                itemListElement: sentenceCourses.map((course, index) => ({
                  '@type': 'ListItem',
                  position: index + 1,
                  name: course.name,
                  description: course.description,
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
