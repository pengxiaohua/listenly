import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { remark } from 'remark'
import html from 'remark-html'
import readingTime from 'reading-time'

// 博客文章目录
const POSTS_DIR = path.join(process.cwd(), 'content/blog')

export interface BlogPostMeta {
  slug: string
  title: string
  summary: string
  date: string
  tags: string[]
  coverImage?: string
  author?: string
  readingTime: string
}

export interface BlogPost extends BlogPostMeta {
  contentHtml: string
}

/**
 * 获取所有博客文章的 slug
 */
export function getAllPostSlugs(): string[] {
  if (!fs.existsSync(POSTS_DIR)) return []
  return fs
    .readdirSync(POSTS_DIR)
    .filter((file) => file.endsWith('.md') || file.endsWith('.mdx'))
    .map((file) => file.replace(/\.(md|mdx)$/, ''))
}

/**
 * 获取所有博客文章的元数据（按日期倒序）
 */
export function getAllPosts(): BlogPostMeta[] {
  const slugs = getAllPostSlugs()
  const posts = slugs
    .map((slug) => getPostMeta(slug))
    .filter((post): post is BlogPostMeta => post !== null)
    .sort((a, b) => (new Date(b.date).getTime() - new Date(a.date).getTime()))
  return posts
}

/**
 * 获取单篇文章的元数据（不含正文 HTML）
 */
export function getPostMeta(slug: string): BlogPostMeta | null {
  const mdPath = path.join(POSTS_DIR, `${slug}.md`)
  const mdxPath = path.join(POSTS_DIR, `${slug}.mdx`)

  let filePath = ''
  if (fs.existsSync(mdPath)) filePath = mdPath
  else if (fs.existsSync(mdxPath)) filePath = mdxPath
  else return null

  const fileContent = fs.readFileSync(filePath, 'utf-8')
  const { data, content } = matter(fileContent)
  const stats = readingTime(content)

  return {
    slug,
    title: data.title ?? '无标题',
    summary: data.summary ?? '',
    date: data.date ? new Date(data.date).toISOString().split('T')[0] : '',
    tags: data.tags ?? [],
    coverImage: data.coverImage,
    author: data.author ?? 'Listenly',
    readingTime: stats.text.replace('read', '阅读'),
  }
}

/**
 * 获取单篇文章的完整数据（含正文 HTML）
 */
export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  const mdPath = path.join(POSTS_DIR, `${slug}.md`)
  const mdxPath = path.join(POSTS_DIR, `${slug}.mdx`)

  let filePath = ''
  if (fs.existsSync(mdPath)) filePath = mdPath
  else if (fs.existsSync(mdxPath)) filePath = mdxPath
  else return null

  const fileContent = fs.readFileSync(filePath, 'utf-8')
  const { data, content } = matter(fileContent)
  const stats = readingTime(content)

  // Markdown → HTML
  const processed = await remark().use(html, { sanitize: false }).process(content)
  const contentHtml = processed.toString()

  return {
    slug,
    title: data.title ?? '无标题',
    summary: data.summary ?? '',
    date: data.date ? new Date(data.date).toISOString().split('T')[0] : '',
    tags: data.tags ?? [],
    coverImage: data.coverImage,
    author: data.author ?? 'Listenly',
    readingTime: stats.text.replace('read', '阅读'),
    contentHtml,
  }
}

/**
 * 按标签获取文章
 */
export function getPostsByTag(tag: string): BlogPostMeta[] {
  return getAllPosts().filter((post) => post.tags.includes(tag))
}

/**
 * 获取所有标签
 */
export function getAllTags(): string[] {
  const posts = getAllPosts()
  const tagSet = new Set<string>()
  posts.forEach((post) => post.tags.forEach((tag) => tagSet.add(tag)))
  return Array.from(tagSet)
}
