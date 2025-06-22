import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// API路由
const authRoutes = [
  "/api/feedback",
  "/api/sync-data",
  "/api/word",
  "/api/sentence",
  "/api/auth",
] as const;

// 页面路由
const protectedPagePaths = [
  "/my",
  "/word",
  "/sentence",
  "/shadowing",
  "/sync",
  "/admin"
] as const;

export function middleware(request: NextRequest) {
  const isProtectedPath = [...authRoutes, ...protectedPagePaths].some(
    (path) => request.nextUrl.pathname.startsWith(path)
  );

  if (isProtectedPath) {
    const userId = request.cookies.get("userId");

    if (!userId) {
      // API 路由返回 401 和错误消息
      if (request.nextUrl.pathname.startsWith("/api")) {
        return new NextResponse("Unauthorized", { status: 401 });
      }
      // 页面路由允许访问，让客户端组件处理认证
      return NextResponse.next();
    }
  }

  // 检查是否是需要认证的路径
  const isAuthRequired = authRoutes.some(route => request.nextUrl.pathname.startsWith(route))

  if (isAuthRequired) {
    const userId = request.cookies.get('userId')?.value

    if (!userId) {
      return NextResponse.json(
        { error: '未登录' },
        { status: 401 }
      )
    }

    // 将userId添加到请求头中
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-user-id', userId)

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  }

  return NextResponse.next();
}

// 配置匹配的路由
export const config = {
  matcher: [
    // API路由添加通配符
    ...authRoutes.map((path) => `${path}/:path*`),
    // 页面路由保持原样
    ...protectedPagePaths,
  ],
};
