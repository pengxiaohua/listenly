import { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from './prisma';

/**
 * 验证用户是否为管理员
 * @param req - Next.js请求对象
 * @returns Promise<{isValid: boolean, userId?: string, error?: string}>
 */
export async function verifyAdmin(req: NextRequest | Request): Promise<{
  isValid: boolean;
  userId?: string;
  error?: string;
}> {
  try {
    // 从请求头获取用户ID（由middleware设置）
    let userId: string | undefined;

    if (req instanceof NextRequest) {
      userId = req.cookies.get('userId')?.value;
    } else {
      userId = req.headers.get('x-user-id') || undefined;
    }

    if (!userId) {
      return { isValid: false, error: '未登录' };
    }

    // 查询用户信息，检查是否为管理员
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, isAdmin: true },
    });

    if (!user) {
      return { isValid: false, error: '用户不存在' };
    }

    if (!user.isAdmin) {
      return { isValid: false, error: '权限不足，需要管理员权限' };
    }

    return { isValid: true, userId };
  } catch (error) {
    console.error('管理员权限验证失败:', error);
    return { isValid: false, error: '验证失败' };
  }
}

/**
 * 创建管理员权限验证的响应装饰器
 * @param handler - 实际的处理函数
 * @returns 包装后的处理函数
 */
export function withAdminAuth<
  T extends NextRequest | Request,
  C extends Record<string, unknown> = Record<string, unknown>
>(
  handler: (req: T, context: C & { userId: string }) => Promise<Response>
) {
  return async (req: T, context?: C): Promise<Response> => {
    const authResult = await verifyAdmin(req);

    if (!authResult.isValid) {
      return NextResponse.json(
        {
          code: authResult.error === '未登录' ? 401 : 403,
          success: false,
          message: authResult.error
        },
        { status: authResult.error === '未登录' ? 401 : 403 }
      );
    }

    return handler(req, {
      ...(context ?? ({} as C)),
      userId: authResult.userId!
    });
  };
}

/**
 * 验证用户身份并返回用户信息
 * @returns Promise<{id: string, userName: string, isAdmin: boolean} | null>
 */
export async function auth(): Promise<{
  id: string;
  userName: string;
  isAdmin: boolean;
} | null> {
  try {
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;

    if (!userId) {
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        userName: true,
        isAdmin: true,
      },
    });

    return user;
  } catch (error) {
    console.error('用户身份验证失败:', error);
    return null;
  }
}
