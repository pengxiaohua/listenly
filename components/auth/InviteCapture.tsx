'use client'

import { useEffect } from 'react'
import Cookies from 'js-cookie'
import { useAuthStore } from '@/store/auth'

const CODE_RE = /^[a-z0-9]{6}$/
const INVITE_COOKIE = 'inviteCode'

/**
 * 邀请码捕获组件（全局挂载，无 UI）。
 *
 * 1. 读取 URL 中的 ?invite=CODE，校验格式后写入 7 天 Cookie，供注册接口读取；
 *    随后从 URL 中清除该参数（避免分享 / 刷新时残留）。
 * 2. 初始化完成且未登录时，自动弹出登录框引导被邀请人登录。
 *
 * Cookie 采用非 httpOnly（客户端写入）+ sameSite=lax，
 * 这样微信授权跳转回站点后服务端仍可读取。
 */
export default function InviteCapture() {
  const isLogged = useAuthStore((s) => s.isLogged)
  const isInitialized = useAuthStore((s) => s.isInitialized)
  const setShowLoginDialog = useAuthStore((s) => s.setShowLoginDialog)

  // 捕获并持久化邀请码
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const code = params.get('invite')
    if (!code || !CODE_RE.test(code)) return

    Cookies.set(INVITE_COOKIE, code, { expires: 7, path: '/', sameSite: 'lax' })

    // 清理 URL 中的 invite 参数，保留其他参数
    params.delete('invite')
    const newSearch = params.toString()
    const newUrl =
      window.location.pathname +
      (newSearch ? `?${newSearch}` : '') +
      window.location.hash
    window.history.replaceState(null, '', newUrl)
  }, [])

  // 未登录且存在邀请码时，自动弹出登录框
  useEffect(() => {
    if (!isInitialized || isLogged) return
    const code = Cookies.get(INVITE_COOKIE)
    if (code && CODE_RE.test(code)) {
      setShowLoginDialog(true)
    }
  }, [isInitialized, isLogged, setShowLoginDialog])

  return null
}
