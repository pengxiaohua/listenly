import { Suspense } from 'react'
import WordClientPage from './WordClientPage'
import { wordsTagsInfo } from '@/constants'
import PublicSeoSection from '@/components/common/PublicSeoSection'

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

const faqs = [
  {
    question: 'Listenly 单词拼写适合哪些英语学习者？',
    answer: '适合中考、高考、四六级、考研、雅思、托福、GRE 以及需要通过听音拼写建立听觉词汇库的学习者。',
  },
  {
    question: '听音拼写和普通背单词有什么区别？',
    answer: '听音拼写会同时训练发音识别、拼写回忆和词义理解，比只看单词表更容易把阅读词汇转化为听力词汇。',
  },
  {
    question: '单词课程包含哪些词库？',
    answer: '当前覆盖中考、高考、四级、六级、考研、雅思、托福、GRE、牛津3000等常用词库，并按课程分组练习。',
  },
]

async function shouldShowSeoIntro(searchParams?: PageProps['searchParams']) {
  const params = await searchParams
  return !params?.set && !params?.group && !params?.id && !params?.category
}

export default async function WordPage({ searchParams }: PageProps) {
  const showSeoIntro = await shouldShowSeoIntro(searchParams)
  const courseItems = Object.entries(wordsTagsInfo).map(([slug, item], index) => ({
    '@type': 'ListItem',
    position: index + 1,
    url: `https://listenly.cn/word?set=${slug}`,
    name: `${item.name}词汇听音拼写`,
    description: `${item.description}，约 ${item.count.toLocaleString('zh-CN')} 个词。`,
  }))

  return (
    <>
      <Suspense fallback={<div className="py-12 text-center text-slate-500">加载练习工具...</div>}>
        <WordClientPage />
      </Suspense>

      {showSeoIntro && (
        <PublicSeoSection>
        <section className="bg-white border-t border-slate-200">
          <div className="mx-auto max-w-6xl px-4 py-10 md:py-14">
            <p className="text-sm font-medium text-indigo-600">Listenly Word Dictation</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">
              在线背单词与英语单词听音拼写训练
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600 md:text-lg">
              Listenly 用“先听发音，再输入拼写，再核对释义”的方式训练英语单词。课程覆盖中考、高考、四六级、考研、雅思、托福、GRE、牛津3000等词库，适合把认识的单词转化为真正听得懂、拼得出的听力词汇。
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
                <h2 className="text-lg font-semibold text-slate-950">训练目标</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  建立声音到拼写、释义和例句的快速映射，减少“看得懂但听不出”的问题。
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
                <h2 className="text-lg font-semibold text-slate-950">课程范围</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  从校内英语到留学考试词汇，按词集和分组练习，方便每天完成固定量。
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
                <h2 className="text-lg font-semibold text-slate-950">练习方式</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  支持英式/美式发音、慢速播放、错词复习和生词本，适合长期滚动复习。
                </p>
              </div>
            </div>

            <div className="mt-8 overflow-hidden rounded-lg border border-slate-200">
              <div className="grid grid-cols-2 bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 md:grid-cols-4">
                <span>词库</span>
                <span>词量</span>
                <span className="hidden md:block">适用阶段</span>
                <span className="hidden md:block">推荐训练</span>
              </div>
              {Object.entries(wordsTagsInfo).map(([slug, item]) => (
                <a
                  key={slug}
                  href={`/word?set=${slug}`}
                  className="grid grid-cols-2 border-t border-slate-200 px-4 py-3 text-sm text-slate-600 hover:bg-indigo-50 md:grid-cols-4"
                >
                  <span className="font-medium text-slate-900">{item.name}</span>
                  <span>{item.count.toLocaleString('zh-CN')} 词</span>
                  <span className="hidden md:block">{item.description}</span>
                  <span className="hidden md:block">听音拼写 + 错词复习</span>
                </a>
              ))}
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
                name: '在线背单词与英语单词听音拼写训练',
                url: 'https://listenly.cn/word',
                inLanguage: 'zh-CN',
                description: 'Listenly 提供中考、高考、四六级、考研、雅思、托福、GRE、牛津3000等英语词库的听音拼写训练。',
              },
              {
                '@type': 'Course',
                name: '英语单词听音拼写训练',
                provider: {
                  '@type': 'Organization',
                  name: 'Listenly',
                  url: 'https://listenly.cn',
                },
                educationalLevel: 'A1-C2',
                teaches: ['英语词汇', '单词拼写', '英语听力词汇', '考试词汇'],
                inLanguage: 'zh-CN',
              },
              {
                '@type': 'ItemList',
                name: 'Listenly 单词课程词库',
                itemListElement: courseItems,
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
