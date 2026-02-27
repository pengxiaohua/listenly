import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { getPostBySlug, getAllPostSlugs, getAllPosts } from '@/lib/blog'
import { Calendar, Clock, ArrowLeft, Tag, ChevronRight } from 'lucide-react'
import BlogViewCounter from '../components/BlogViewCounter'

// 静态生成所有博客详情页
export function generateStaticParams() {
  const slugs = getAllPostSlugs()
  return slugs.map((slug) => ({ slug }))
}

// 动态 SEO metadata
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const post = await getPostBySlug(slug)
  if (!post) return { title: '文章未找到' }

  return {
    title: post.title,
    description: post.summary,
    keywords: post.tags,
    openGraph: {
      title: post.title,
      description: post.summary,
      url: `https://listenly.cn/blog/${slug}`,
      type: 'article',
      publishedTime: post.date,
      authors: [post.author || 'Listenly'],
      tags: post.tags,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.summary,
    },
    alternates: {
      canonical: `https://listenly.cn/blog/${slug}`,
    },
  }
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const post = await getPostBySlug(slug)
  if (!post) notFound()

  // 获取相关推荐文章（同标签的其他文章）
  const allPosts = getAllPosts()
  const relatedPosts = allPosts
    .filter((p) => p.slug !== slug && p.tags.some((t) => post.tags.includes(t)))
    .slice(0, 3)

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-gray-950 dark:to-gray-900">
      <div className="container mx-auto px-4 py-8 md:py-12">
        <div className="max-w-3xl mx-auto">
          {/* 面包屑导航 */}
          <nav className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 mb-8">
            <Link href="/" className="hover:text-blue-600 transition-colors">首页</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link href="/blog" className="hover:text-blue-600 transition-colors">博客</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-gray-900 dark:text-white font-medium truncate max-w-[200px]">{post.title}</span>
          </nav>

          {/* 文章头部 */}
          <header className="mb-10">
            {/* 标签 */}
            <div className="flex flex-wrap gap-2 mb-4">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full text-sm font-medium"
                >
                  <Tag className="w-3 h-3" />
                  {tag}
                </span>
              ))}
            </div>

            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white leading-tight mb-4">
              {post.title}
            </h1>

            {post.summary && (
              <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed mb-6">
                {post.summary}
              </p>
            )}

            {/* 元信息 */}
            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 pb-6 border-b border-gray-200 dark:border-gray-800">
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                {post.date}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                {post.readingTime}
              </span>
              <BlogViewCounter slug={slug} />
              {post.author && (
                <span>作者：{post.author}</span>
              )}
            </div>
          </header>

          {/* 文章正文 */}
          <article
            className="prose prose-lg prose-gray dark:prose-invert max-w-none
              prose-headings:font-bold prose-headings:text-gray-900 dark:prose-headings:text-white
              prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl
              prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-p:leading-relaxed
              prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline
              prose-strong:text-gray-900 dark:prose-strong:text-white
              prose-code:bg-gray-100 dark:prose-code:bg-gray-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm
              prose-blockquote:border-l-blue-500 prose-blockquote:bg-blue-50/50 dark:prose-blockquote:bg-blue-900/10 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:rounded-r-lg
              prose-table:border-collapse
              prose-th:bg-gray-50 dark:prose-th:bg-gray-800 prose-th:px-4 prose-th:py-2 prose-th:border prose-th:border-gray-200 dark:prose-th:border-gray-700
              prose-td:px-4 prose-td:py-2 prose-td:border prose-td:border-gray-200 dark:prose-td:border-gray-700
              prose-img:rounded-xl prose-img:shadow-md
              prose-li:text-gray-700 dark:prose-li:text-gray-300
              prose-hr:border-gray-200 dark:prose-hr:border-gray-800
              mb-12"
            dangerouslySetInnerHTML={{ __html: post.contentHtml }}
          />

          {/* 返回 + 相关推荐 */}
          <div className="border-t border-gray-200 dark:border-gray-800 pt-10">
            {/* 相关文章 */}
            {relatedPosts.length > 0 && (
              <div className="mb-10">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">相关推荐</h3>
                <div className="grid gap-4">
                  {relatedPosts.map((related) => (
                    <Link
                      key={related.slug}
                      href={`/blog/${related.slug}`}
                      className="group flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                          {related.title}
                        </h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{related.date} · {related.readingTime}</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 flex-shrink-0" />
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <Link
              href="/blog"
              className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              返回博客列表
            </Link>
          </div>
        </div>
      </div>

      {/* JSON-LD 结构化数据 */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            "headline": post.title,
            "description": post.summary,
            "datePublished": post.date,
            "dateModified": post.date,
            "author": {
              "@type": "Person",
              "name": post.author || "Listenly"
            },
            "publisher": {
              "@type": "Organization",
              "name": "Listenly",
              "url": "https://listenly.cn"
            },
            "mainEntityOfPage": {
              "@type": "WebPage",
              "@id": `https://listenly.cn/blog/${slug}`
            },
            "keywords": post.tags.join(', ')
          })
        }}
      />

      {/* 面包屑 JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              { "@type": "ListItem", "position": 1, "name": "首页", "item": "https://listenly.cn" },
              { "@type": "ListItem", "position": 2, "name": "博客", "item": "https://listenly.cn/blog" },
              { "@type": "ListItem", "position": 3, "name": post.title, "item": `https://listenly.cn/blog/${slug}` },
            ]
          })
        }}
      />
    </div>
  )
}
