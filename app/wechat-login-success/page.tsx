'use client'

import { useEffect } from 'react'

export default function WechatLoginSuccessPage() {
  useEffect(() => {
    // 通知父页面登录成功
    if (window.parent !== window) {
      // 在iframe中
      console.log('在iframe中，通知父页面登录成功')
      window.parent.postMessage({
        type: 'wechat_login_success',
        message: '微信登录成功'
      }, '*')
    } else {
      // 不在iframe中，直接重定向到首页
      console.log('不在iframe中，重定向到首页')
      window.location.href = '/'
    }
  }, [])

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">微信登录成功</h1>
        <p className="text-gray-600">正在跳转...</p>
      </div>
    </div>
  )
}
