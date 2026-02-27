import Link from 'next/link'
import { getAllPosts, getAllTags } from '@/lib/blog'
import { Calendar, Clock, Tag, ArrowRight, BookOpen } from 'lucide-react'
import BlogViewCount from './components/BlogViewCount'

export default function BlogListPage() {
  const posts = getAllPosts()
  const tags = getAllTags()

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-gray-950 dark:to-gray-900">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-16 md:py-24">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-10 left-10 w-64 h-64 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
          <div className="absolute top-20 right-20 w-64 h-64 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium mb-6">
              <BookOpen className="w-4 h-4" />
              Listenly 学习博客
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              英语学习干货分享
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
              科学的方法 + 持续的练习 = 英语水平的飞跃。<br />
              这里分享最实用的英语学习技巧和备考攻略。
            </p>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 pb-20">
        <div className="max-w-4xl mx-auto">
          {/* 标签筛选 */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-10">
              <span className="text-sm text-gray-500 dark:text-gray-400 leading-8">热门话题：</span>
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full text-sm hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                >
                  <Tag className="w-3 h-3" />
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* 文章列表 */}
          {posts.length === 0 ? (
            <div className="text-center py-20 text-gray-500 dark:text-gray-400">
              <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg">暂无文章，敬请期待...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {posts.map((post, index) => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="group block"
                >
                  <article
                    className="bg-white dark:bg-gray-800/50 rounded-2xl p-6 md:p-8 shadow-sm hover:shadow-lg border border-gray-100 dark:border-gray-800 hover:border-blue-200 dark:hover:border-blue-800 transition-all duration-300"
                    style={{
                      animationDelay: `${index * 100}ms`,
                    }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {/* 标签 */}
                        <div className="flex flex-wrap gap-2 mb-3">
                          {post.tags.map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center px-2.5 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-md text-xs font-medium"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>

                        {/* 标题 */}
                        <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors mb-3 line-clamp-2">
                          {post.title}
                        </h2>

                        {/* 摘要 */}
                        <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4 line-clamp-2">
                          {post.summary}
                        </p>

                        {/* 元信息 */}
                        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-500">
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {post.date}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {post.readingTime}
                          </span>
                          <BlogViewCount slug={post.slug} />
                          {post.author && (
                            <span className="text-gray-400 dark:text-gray-600">
                              {post.author}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 箭头 */}
                      <div className="hidden md:flex items-center justify-center w-10 h-10 rounded-full bg-gray-50 dark:bg-gray-700 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30 transition-colors flex-shrink-0 mt-2">
                        <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors group-hover:translate-x-0.5 transform duration-200" />
                      </div>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* JSON-LD 结构化数据 */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Blog",
            "name": "Listenly 英语学习博客",
            "description": "分享英语听力训练方法、影子跟读技巧、备考攻略等实用英语学习干货。",
            "url": "https://listenly.cn/blog",
            "publisher": {
              "@type": "Organization",
              "name": "Listenly",
              "url": "https://listenly.cn"
            },
            "blogPost": posts.map((post) => ({
              "@type": "BlogPosting",
              "headline": post.title,
              "description": post.summary,
              "datePublished": post.date,
              "author": {
                "@type": "Person",
                "name": post.author || "Listenly"
              },
              "url": `https://listenly.cn/blog/${post.slug}`
            }))
          })
        }}
      />
    </div>
  )
}
