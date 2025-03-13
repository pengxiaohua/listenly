import { requireAuth } from './auth'

// 创建一个包装了认证逻辑的fetch函数
export async function authFetch(input: RequestInfo | URL, init?: RequestInit) {
  try {
    const response = await fetch(input, init)
    
    if (response.status === 401) {
      // 如果返回401，显示登录弹窗
      requireAuth()
      throw new Error('Unauthorized')
    }
    
    return response
  } catch (error) {
    // 重新抛出错误，让调用者处理
    throw error
  }
} 