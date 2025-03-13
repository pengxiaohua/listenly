import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// API路由
const protectedApiPaths = [
  '/api/dictation',
  '/api/feedback',
  '/api/my-records',
  '/api/sync-data',
  '/api/word-records',
  '/api/words',
] as const

// 页面路由
const protectedPagePaths = [
  '/dictation',
  '/my',
  '/spell',
  '/sync'
] as const

export function middleware(request: NextRequest) {
  const isProtectedPath = [
    ...protectedApiPaths,
    ...protectedPagePaths
  ].some(path => request.nextUrl.pathname.startsWith(path))

  if (isProtectedPath) {
    const userId = request.cookies.get('userId')

    if (!userId) {
      // API 路由返回 401 和错误消息
      if (request.nextUrl.pathname.startsWith('/api')) {
        return new NextResponse('Unauthorized', { status: 401 })
      }
      // 页面路由允许访问，让客户端组件处理认证
      return NextResponse.next()
    }
  }

  return NextResponse.next()
}

// 配置匹配的路由
export const config = {
  matcher: [
    // API路由添加通配符
    ...protectedApiPaths.map(path => `${path}/:path*`),
    // 页面路由保持原样
    ...protectedPagePaths
  ]
} 