'use client'

import { useEffect, useState } from 'react'
import { Eye } from 'lucide-react'

interface BlogViewCounterProps {
  slug: string
  className?: string
}

/**
 * 博客阅读量计数器（客户端组件）
 * - 页面加载时自动上报阅读量（同一 session 内同一篇文章只上报一次）
 * - 实时显示阅读次数
 */
export default function BlogViewCounter({ slug, className = '' }: BlogViewCounterProps) {
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    if (!slug) return

    const sessionKey = `blog-viewed-${slug}`
    const hasViewed = sessionStorage.getItem(sessionKey)

    if (!hasViewed) {
      // 首次访问，上报阅读量
      fetch('/api/blog/view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (typeof data.count === 'number' && data.count > 0) {
            // 只有 POST 确实写入成功才标记已读
            setCount(data.count)
            sessionStorage.setItem(sessionKey, '1')
          } else {
            // POST 返回了错误响应，回退到 GET
            fetchCount()
          }
        })
        .catch(() => {
          fetchCount()
        })
    } else {
      fetchCount()
    }

    function fetchCount() {
      fetch(`/api/blog/view?slug=${encodeURIComponent(slug)}`)
        .then((res) => res.json())
        .then((data) => setCount(data.count ?? 0))
        .catch(() => setCount(0))
    }
  }, [slug])

  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <Eye className="w-3.5 h-3.5" />
      {count ?? 0} 次阅读
    </span>
  )
}
