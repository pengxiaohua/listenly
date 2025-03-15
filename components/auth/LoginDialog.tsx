"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Script from "next/script";

// 导入 Radix UI 的类型
import { DialogContentProps } from "@radix-ui/react-dialog";

declare global {
  interface Window {
    nvc: any;
    AliyunCaptchaConfig: {
      region: string
      prefix: string
    }
    initAliyunCaptcha: any
  }
}

export default function LoginDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [nvcReady, setNvcReady] = useState(false);

  const [captchaInstance, setCaptchaInstance] = useState<any>(null)

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  useEffect(() => {
    if (nvcReady) (
      handleSendCode()
    )
  }, [nvcReady])

  const handleSendCode = async () => {
    if (!/^1\d{10}$/.test(phone)) {
      toast.error("请输入正确的手机号");
      return;
    }

    // if (!window.nvc) {
    //   console.log("nvc not found:", window.nvc);
    //   toast.error("验证码组件未准备就绪，请刷新页面重试");
    //   return;
    // }

    try {
      setLoading(true);
      // const nvcData = await new Promise((resolve, reject) => {
      //   window.nvc.getNVCVal((nvcVal: any) => {
      //     console.log("getNVCVal result:", nvcVal);
      //     if (nvcVal) {
      //       resolve(nvcVal);
      //     } else {
      //       reject(new Error("获取验证码失败"));
      //     }
      //   });
      // });

      const res = await fetch("/api/auth/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          // ...JSON.parse(nvcData as string),
        }),
      });
      console.log({ res });
      if (!res.ok) throw new Error("发送失败");

      setCountdown(60);
      toast.success("验证码已发送");
    } catch (error) {
      console.error("发送验证码失败:", error);
      toast.error("发送失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!code) {
      toast.error("请输入验证码");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/auth/sms/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code }),
      });

      if (!res.ok) throw new Error("登录失败");

      onOpenChange(false);
      window.location.reload(); // 登录成功后刷新页面
    } catch (error) {
      console.error(error);
      toast.error("登录失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  // 业务请求验证回调
  const captchaVerifyCallback = async (captchaVerifyParam: string) => {
    console.log({ captchaVerifyParam });
    try {
      const res = await fetch('/api/auth/verify-captcha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ captchaVerifyParam })
      })
      const result = await res.json()

      return {
        captchaResult: result.captchaVerifyResult,
        bizResult: result.success
      }
    } catch (error) {
      console.error('验证码验证失败:', error)
      return {
        captchaResult: false,
        bizResult: false
      }
    }
  }

  // 业务结果回调
  const onBizResultCallback = (bizResult: boolean) => {
    console.log({ bizResult })
    if (bizResult) {
      setNvcReady(true)
    } else {
      toast.error('验证失败，请重试')
      setNvcReady(false)
    }
  }

  // 获取验证码实例
  const getInstance = (instance: any) => {
    setCaptchaInstance(instance)
  }

  useEffect(() => {
    if (open && window?.initAliyunCaptcha) {
      window?.initAliyunCaptcha({
        // 在 Next.js 中，只有以 NEXT_PUBLIC_ 开头的环境变量才能在客户端代码中访问
        SceneId: process.env.NEXT_PUBLIC_ALIYUN_CAPTCHA_SCENE_ID,
        prefix: process.env.NEXT_PUBLIC_ALIYUN_CAPTCHA_PREFIX,
        mode: 'popup',
        element: '#captcha-element',
        button: '#send-code-button',
        captchaVerifyCallback,
        onBizResultCallback,
        getInstance,
        slideStyle: {
          width: 312,
          height: 40,
        },
        language: 'cn',
        immediate: false
      });
    }

    return () => {
      // 清理验证码相关元素，避免多次初始化问题
      document.getElementById('aliyunCaptcha-mask')?.remove();
      document.getElementById('aliyunCaptcha-window-popup')?.remove();
    }
  }, [open]);

  // 处理点击外部事件
  const handlePointerDownOutside: DialogContentProps["onPointerDownOutside"] = (event) => {
    // 阻止默认行为，防止对话框关闭
    event.preventDefault();
  };

  return (
    <>
      {/* 配置脚本 */}
      {/* <Script
        id="aliyun-captcha-config"
      >
        {`
          window.AliyunCaptchaConfig = {
            region: "cn",
            prefix: "15om2h"
          };
        `}
      </Script> */}
      <Script
        src="https://o.alicdn.com/captcha-frontend/aliyunCaptcha/AliyunCaptcha.js"
        strategy="lazyOnload"
      />

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[368px]" onPointerDownOutside={handlePointerDownOutside}>
          <DialogHeader>
            <DialogTitle>手机号登录</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Input
                type="tel"
                className="h-10 w-full"
                placeholder="请输入手机号"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div id="captcha-element"></div>

            <div className="flex gap-2">
              <Input
                type="text"
                className="h-10 w-full"
                placeholder="请输入验证码"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
              <Button
                variant="outline"
                className="h-10"
                id="send-code-button"
                // onClick={handleSendCode}
                disabled={countdown > 0}
              >
                {countdown > 0 ? `${countdown}s后重试` : "发送验证码"}
              </Button>
            </div>

            <Button
              className="h-10 w-full"
              onClick={handleLogin}
              disabled={loading}
            >
              登录
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
