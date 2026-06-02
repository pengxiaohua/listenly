'use client'

import { useMemo, useState } from 'react'
import guideList from '@/content/guide/guide-list.json'

interface GuideItem {
  id: string
  menuTitle: string
  title: string
  time: string
  content: string
  videoUrl?: string
}

export default function GuidePage() {
  const guides = guideList as GuideItem[]
  const [activeId, setActiveId] = useState(guides[0]?.id ?? '')

  const activeGuide = useMemo(
    () => guides.find(item => item.id === activeId) ?? guides[0],
    [activeId, guides]
  )

  if (!activeGuide) {
    return (
      <div className="container mx-auto p-4 md:p-6">
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6">
          暂无使用指南内容
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold">使用指南</h1>
        <p className="text-sm text-slate-500 mt-1">点击左侧菜单查看不同功能介绍</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <aside className="md:col-span-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3">
          <div className="flex md:flex-col gap-2 overflow-x-auto md:overflow-visible">
            {guides.map(item => {
              const active = item.id === activeGuide.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveId(item.id)}
                  className={`whitespace-nowrap text-left px-3 py-2 rounded-lg border transition-colors cursor-pointer ${
                    active
                      ? 'bg-indigo-50 text-indigo-600 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-700'
                      : 'bg-transparent border-transparent text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {item.menuTitle}
                </button>
              )
            })}
          </div>
        </aside>

        <main className="md:col-span-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 md:p-6">
          <h2 className="text-xl md:text-2xl font-semibold">{activeGuide.title}</h2>
          <p className="text-sm text-slate-500 mt-1">{activeGuide.time}</p>

          {activeGuide.videoUrl && (
            <div className="mt-4 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
              <video
                className="w-full max-h-[460px] bg-black"
                controls
                preload="metadata"
                src={activeGuide.videoUrl}
              >
                您的浏览器不支持 video 标签
              </video>
            </div>
          )}

          <article className="mt-4 text-sm md:text-base leading-7 text-slate-700 dark:text-slate-200 whitespace-pre-wrap">
            {activeGuide.content}
          </article>
        </main>
      </div>
    </div>
  )
}
