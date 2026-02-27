'use client'

import { useEffect, useState } from 'react'
import { Eye } from 'lucide-react'

interface BlogViewCountProps {
  slug: string
  className?: string
}

/**
 * 博客阅读量展示（仅展示，不上报）
 * 用于列表页显示每篇文章的阅读量
 */
export default function BlogViewCount({ slug, className = '' }: BlogViewCountProps) {
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    fetch(`/api/blog/view?slug=${encodeURIComponent(slug)}`)
      .then((res) => res.json())
      .then((data) => setCount(data.count ?? 0))
      .catch(() => setCount(0))
  }, [slug])

  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <Eye className="w-3.5 h-3.5" />
      {count ?? 0}
    </span>
  )
}
