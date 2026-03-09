'use client'

import { ReactNode, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuthStore } from '@/store/auth'

interface AdminPageDefinition {
  slug: string
  label: string
  element: ReactNode
}

interface AdminLayoutProps {
  pages: AdminPageDefinition[]
}

export default function AdminLayout({ pages }: AdminLayoutProps) {
  const { isInitialized, isLogged, userInfo } = useAuthStore()
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialTab = searchParams.get('tab') ?? pages[0]?.slug ?? ''
  const [activeTab, setActiveTab] = useState(initialTab)

  if (!isInitialized) {
    return (
      <div className="flex h-[calc(100vh-164px)] items-center justify-center text-2xl font-bold">
        Loading...
      </div>
    )
  }

  if (!isLogged || !userInfo?.isAdmin) {
    return (
      <div className="flex h-[calc(100vh-164px)] items-center justify-center text-xl font-bold">
        <div className="text-center">
          <p>您没有权限访问此页面</p>
          <p className="text-sm text-slate-500 mt-2">需要管理员权限</p>
        </div>
      </div>
    )
  }

  const handleTabChange = (slug: string) => {
    setActiveTab(slug)
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', slug)
    router.replace(`/admin?${params.toString()}`)
  }

  return (
    <div className="container mx-auto py-4">
      <div className="flex gap-4 mb-6 border-b border-slate-200 dark:border-slate-800">
        {pages.map(({ slug, label }) => (
          <button
            key={slug}
            onClick={() => handleTabChange(slug)}
            className={`cursor-pointer pb-2 transition-colors ${
              activeTab === slug
                ? 'font-semibold border-b-2 border-indigo-500 text-indigo-600'
                : 'text-slate-500 hover:text-indigo-500'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-4">
        {pages.map(({ slug, element }) => (
          activeTab === slug ? (
            <div key={`${slug}-${activeTab}`}>
              {element}
            </div>
          ) : null
        ))}
      </div>
    </div>
  )
}
