"use client";

import {
  useState,
  useEffect,
  useCallback
} from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs, TabsContent,
  // TabsList, TabsTrigger
} from "@/components/ui/tabs";
import Script from "next/script";

// 导入 Radix UI 的类型
import { DialogContentProps } from "@radix-ui/react-dialog";

declare global {
  interface Window {
    nvc: {
      init: (config: {
        SceneId: string
        prefix: string
        mode: string
        element: string
        button: string
      }) => void
    }
    AliyunCaptchaConfig: {
      region: string
      prefix: string
    }
    initAliyunCaptcha: (config: {
      SceneId: string
      prefix: string
      mode: string
      element: string
      button: string
      captchaVerifyCallback: (param: string) => Promise<{ captchaResult: boolean; bizResult: boolean }>
      onBizResultCallback: (result: boolean) => void
      getInstance: (instance: { init: (config: { SceneId: string; prefix: string; mode: string; element: string; button: string }) => void }) => void
      slideStyle?: {
        width: number
        height: number
      }
      language?: string
      immediate?: boolean
    }) => void
  }
}

export default function LoginDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const checkAuth = useAuthStore(state => state.checkAuth);

  // const [phone, setPhone] = useState("");
  // const [code, setCode] = useState("");
  // const [countdown, setCountdown] = useState(0);
  // const [loading, setLoading] = useState(false);
  const [nvcReady, setNvcReady] = useState(false);
  const [wechatLoading, setWechatLoading] = useState(false);
  const [wechatAuthUrl, setWechatAuthUrl] = useState("");
  // const [activeTab, setActiveTab] = useState("sms");
  const [activeTab, setActiveTab] = useState("wechat");

  const [, setCaptchaInstance] = useState<{
    init: (config: {
      SceneId: string
      prefix: string
      mode: string
      element: string
      button: string
    }) => void
  } | null>(null)

  // 监听弹窗打开状态，重置输入框
  // useEffect(() => {
  //   if (open) {
  //     setCode(""); // 重置验证码
  //     setCountdown(0); // 重置倒计时
  //   }
  // }, [open]);

  // useEffect(() => {
  //   if (countdown > 0) {
  //     const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
  //     return () => clearTimeout(timer);
  //   }
  // }, [countdown]);

  // const handleSendCode =  useCallback(async () => {
  //   if (!/^1\d{10}$/.test(phone)) {
  //     toast.error("请输入正确的手机号");
  //     return;
  //   }

  //   try {
  //     setLoading(true);
  //     const res = await fetch("/api/auth/sms/send", {
  //       method: "POST",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify({
  //         phone,
  //       }),
  //     });

  //     if (!res.ok) throw new Error("发送失败");

  //     setCountdown(60);
  //     toast.success("验证码已发送");
  //   } catch (error) {
  //     console.error("发送验证码失败:", error);
  //     toast.error("发送失败，请重试");
  //   } finally {
  //     setLoading(false);
  //   }
  // }, [phone])

  // useEffect(() => {
  //   if (nvcReady) (
  //     handleSendCode()
  //   )
  // }, [nvcReady, handleSendCode])

  // 监听微信Tab激活状态，加载iframe
  useEffect(() => {
    if (activeTab === "wechat" && !wechatAuthUrl) {
      console.log("检测到微信Tab激活，开始加载微信授权URL");
      loadWechatAuthUrl();
    }
  }, [activeTab, wechatAuthUrl])

  // 监听页面消息，检测登录完成
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      // 检查消息来源和内容
      if (event.data && event.data.type === 'wechat_login_success') {
        console.log("检测到微信登录成功");
        onOpenChange(false);
        // 更新认证状态
        await checkAuth();
        // 重定向到我的页面
        router.push('/my');
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onOpenChange, checkAuth, router])

  // const handleSmsLogin = async () => {
  //   if (!code) {
  //     toast.error("请输入验证码");
  //     return;
  //   }

  //   try {
  //     setLoading(true);
  //     const res = await fetch("/api/auth/sms/login", {
  //       method: "POST",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify({ phone, code }),
  //     });

  //     if (!res.ok) throw new Error("登录失败");

  //     onOpenChange(false);
  //     // 更新认证状态
  //     await checkAuth();
  //     // 重定向到我的页面
  //     router.push('/my');
  //   } catch (error) {
  //     console.error(error);
  //     toast.error("登录失败，请重试");
  //   } finally {
  //     setLoading(false);
  //   }
  // };

        // 加载微信授权URL
  const loadWechatAuthUrl = async () => {
    try {
      setWechatLoading(true);
      console.log("发送请求到 /api/auth/wechat/login");

      const res = await fetch("/api/auth/wechat/login");
      console.log("API响应状态:", res.status);

      const data = await res.json();
      console.log("API响应数据:", data);

      if (!res.ok) {
        throw new Error(data.error || "获取微信登录链接失败");
      }

      if (!data.authUrl) {
        throw new Error("未获取到微信授权链接");
      }

      console.log("获取到微信授权URL:", data.authUrl);
      setWechatAuthUrl(data.authUrl);

    } catch (error) {
      console.error("加载微信授权URL失败:", error);
      const errorMessage = error instanceof Error ? error.message : "未知错误";
      toast.error(`加载失败: ${errorMessage}`);
    } finally {
      setWechatLoading(false);
    }
  };

  // 刷新微信授权URL
  // const refreshWechatAuth = () => {
  //   setWechatAuthUrl("");
  //   loadWechatAuthUrl();
  // };

  // 处理Tab切换
  const handleTabChange = (value: string) => {
    setActiveTab(value);
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
  const onBizResultCallback = useCallback((bizResult: boolean) => {
    console.log({ bizResult, nvcReady })
    if (bizResult) {
      setNvcReady(true)
    } else {
      toast.error('验证失败，请重试')
      setNvcReady(false)
    }
  }, [nvcReady])

  // 获取验证码实例
  const getInstance = (instance: {
    init: (config: {
      SceneId: string
      prefix: string
      mode: string
      element: string
      button: string
    }) => void
  }) => {
    setCaptchaInstance(instance)
  }

  useEffect(() => {
    if (open && window?.initAliyunCaptcha) {
      window?.initAliyunCaptcha({
        // 在 Next.js 中，只有以 NEXT_PUBLIC_ 开头的环境变量才能在客户端代码中访问
        SceneId: process.env.NEXT_PUBLIC_ALIYUN_CAPTCHA_SCENE_ID as string,
        prefix: process.env.NEXT_PUBLIC_ALIYUN_CAPTCHA_PREFIX as string,
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
  }, [open, onBizResultCallback]);

  // 处理点击外部事件
  const handlePointerDownOutside: DialogContentProps["onPointerDownOutside"] = (event) => {
    // 阻止默认行为，防止对话框关闭
    event.preventDefault();
  };

  return (
    <>
      <Script
        src="https://o.alicdn.com/captcha-frontend/aliyunCaptcha/AliyunCaptcha.js"
        strategy="lazyOnload"
      />

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[400px]" onPointerDownOutside={handlePointerDownOutside}>
          <DialogHeader>
            <DialogTitle>用户登录</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="sms" className="w-full" value={activeTab} onValueChange={handleTabChange}>
            {/* <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="sms">手机验证码</TabsTrigger>
              <TabsTrigger value="wechat">微信扫码</TabsTrigger>
            </TabsList> */}

            <TabsContent value="sms" className="space-y-4 mt-4">
              {/* <div>
                <Input
                  type="tel"
                  className="h-10 w-full"
                  placeholder="请输入手机号"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div id="captcha-element"></div> */}

              {/* <div className="flex gap-2">
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
                  disabled={countdown > 0}
                >
                  {countdown > 0 ? `${countdown}s后重试` : "发送验证码"}
                </Button>
              </div> */}

              {/* <Button
                className="h-10 w-full"
                onClick={handleSmsLogin}
                disabled={loading}
              >
                {loading ? "登录中..." : "登录"}
              </Button> */}
            </TabsContent>

            <TabsContent value="wechat" className="space-y-4 mt-4">
              <div className="flex flex-col items-center justify-center space-y-4">

                {wechatLoading ? (
                  <div className="flex flex-col items-center space-y-2">
                    <div className="w-full h-96 bg-gray-100 rounded-lg flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
                    </div>
                    <p className="text-sm text-gray-500">正在加载微信授权页面...</p>
                  </div>
                ) : wechatAuthUrl ? (
                  <div className="flex flex-col items-center space-y-3 w-full">
                    <div className="w-full border rounded-lg overflow-hidden">
                      <iframe
                        src={wechatAuthUrl}
                        className="w-full h-99 border-0"
                        style={{ overflow: 'hidden' }}
                        title="微信授权登录"
                        sandbox="allow-same-origin allow-scripts allow-forms allow-top-navigation"
                        onError={(e) => {
                          console.error("iframe加载失败:", e);
                          toast.error("微信授权页面加载失败，请使用直接跳转方式");
                        }}
                      />
                    </div>
                    {/* <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={refreshWechatAuth}
                        className="text-xs"
                      >
                        刷新
                      </Button>
                    </div> */}
                  </div>
                ) : (
                  <div className="flex flex-col items-center space-y-2">
                    <div className="w-full h-96 bg-gray-100 rounded-lg flex items-center justify-center">
                      <p className="text-sm text-gray-500">点击刷新加载微信授权页面</p>
                    </div>
                    <Button
                      className="bg-green-500 hover:bg-green-600"
                      onClick={loadWechatAuthUrl}
                    >
                      加载微信登录
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
}
