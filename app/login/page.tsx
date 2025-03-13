'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"

declare global {
  interface Window {
    NVC_Opt: any
    nvc: any
  }
}

export default function LoginPage() {
  const router = useRouter()

  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [countdown, setCountdown] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // 初始化滑动验证码
    window.NVC_Opt = {
      appkey: 'FFFF0N0000000000XXXX', // 替换为你的appkey
      scene: 'nc_login', // 场景标识
      renderTo: '#captcha',
      trans: { "key1": "code0", "nvcCode": 200 },
      elements: ['#sendCode'],
      success: function (data: any) { console.log(data) },
      error: function (s: any) { console.log(s) }
    }

    // 加载阿里云验证码脚本
    const script = document.createElement('script')
    script.src = '//g.alicdn.com/AWSC/AWSC/awsc.js'
    script.async = true
    document.body.appendChild(script)

    return () => {
      document.body.removeChild(script)
    }
  }, [])

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  const handleSendCode = async () => {
    if (!/^1\d{10}$/.test(phone)) {
      toast.error("请输入正确的手机号")
      return
    }

    try {
      setLoading(true)
      const nvcData = await new Promise((resolve, reject) => {
        window.nvc.getNVCVal((nvcVal: any) => resolve(nvcVal))
      })

      const res = await fetch('/api/auth/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          ...JSON.parse(nvcData)
        })
      })

      if (!res.ok) throw new Error('发送失败')

      setCountdown(60)
      toast.success("验证码已发送")
    } catch (error) {
        console.error(error);
      toast.error("发送失败，请重试")
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async () => {
    if (!code) {
      toast.error("请输入验证码")
      return
    }

    try {
      setLoading(true)
      const res = await fetch('/api/auth/sms/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code })
      })

      if (!res.ok) throw new Error('登录失败')

      router.push('/') // 登录成功后跳转
    } catch (error) {
        console.error(error);
      toast.error("登录失败，请重试")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-sm mx-auto mt-20 p-6">
      <h1 className="text-2xl font-bold mb-6">手机号登录</h1>
      
      <div className="space-y-4">
        <div>
          <Input
            type="tel"
            placeholder="请输入手机号"
            value={phone}
            onChange={e => setPhone(e.target.value)}
          />
        </div>

        <div id="captcha"></div>

        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="请输入验证码"
            value={code}
            onChange={e => setCode(e.target.value)}
          />
          <Button
            variant="outline"
            onClick={handleSendCode}
            disabled={countdown > 0 || loading}
          >
            {countdown > 0 ? `${countdown}s` : '发送验证码'}
          </Button>
        </div>

        <Button 
          className="w-full" 
          onClick={handleLogin}
          disabled={loading}
        >
          登录
        </Button>
      </div>
    </div>
  )
} 