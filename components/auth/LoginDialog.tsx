"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DialogContentProps } from "@radix-ui/react-dialog";
import Cookies from "js-cookie";

import Link from "next/link";

function useIsPC() {
  const [isPC, setIsPC] = useState(true);
  useEffect(() => {
    const ua = navigator.userAgent;
    setIsPC(!/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua));
  }, []);
  return isPC;
}

export default function LoginDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const checkAuth = useAuthStore((state) => state.checkAuth);
  const isPC = useIsPC();

  const [wechatLoading, setWechatLoading] = useState(false);
  const [wechatAuthUrl, setWechatAuthUrl] = useState("");
  const [activeTab, setActiveTab] = useState(isPC ? "wechat" : "email");

  // 邮箱登录状态
  const [email, setEmail] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [emailCountdown, setEmailCountdown] = useState(0);
  const [emailSending, setEmailSending] = useState(false);
  const [emailLogging, setEmailLogging] = useState(false);
  const [agreed, setAgreed] = useState(false);

  // 短信登录状态
  const [phone, setPhone] = useState("");
  const [smsCode, setSmsCode] = useState("");
  const [smsCountdown, setSmsCountdown] = useState(0);
  const [smsSending, setSmsSending] = useState(false);
  const [smsLogging, setSmsLogging] = useState(false);
  const [smsAgreed, setSmsAgreed] = useState(false);

  // 账号密码登录状态
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [accountLogging, setAccountLogging] = useState(false);
  const [accountAgreed, setAccountAgreed] = useState(false);

  // 邀请码（来自链接 Cookie，可由用户修改并同步回 Cookie）
  const [inviteCode, setInviteCode] = useState("");

  // 规范化邀请码输入并同步到 Cookie（供注册接口读取）
  const handleInviteChange = useCallback((value: string) => {
    const code = value.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 6);
    setInviteCode(code);
    if (code) {
      Cookies.set("inviteCode", code, { expires: 7, path: "/", sameSite: "lax" });
    } else {
      Cookies.remove("inviteCode", { path: "/" });
    }
  }, []);

  // 设备变化时更新默认 Tab
  useEffect(() => {
    setActiveTab(isPC ? "wechat" : "email");
  }, [isPC]);

  // 重置表单
  useEffect(() => {
    if (open) {
      setEmailCode("");
      setEmailCountdown(0);
      setSmsCode("");
      setSmsCountdown(0);
      // 邀请码默认取 Cookie 中链接带来的值
      setInviteCode(Cookies.get("inviteCode") || "");
    }
  }, [open]);

  // 邮箱倒计时
  useEffect(() => {
    if (emailCountdown > 0) {
      const timer = setTimeout(() => setEmailCountdown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [emailCountdown]);

  // 短信倒计时
  useEffect(() => {
    if (smsCountdown > 0) {
      const timer = setTimeout(() => setSmsCountdown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [smsCountdown]);

  // 微信 Tab 激活时加载 iframe
  useEffect(() => {
    if (open && activeTab === "wechat" && !wechatAuthUrl) {
      loadWechatAuthUrl();
    }
  }, [open, activeTab, wechatAuthUrl]);

  // 监听微信登录成功消息
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.data && event.data.type === "wechat_login_success") {
        onOpenChange(false);
        await checkAuth();
        router.push("/my");
      }
    };
    if (open) {
      window.addEventListener("message", handleMessage);
      return () => window.removeEventListener("message", handleMessage);
    }
  }, [open, onOpenChange, checkAuth, router]);

  const loadWechatAuthUrl = async () => {
    try {
      setWechatLoading(true);
      const res = await fetch("/api/auth/wechat/login");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "获取微信登录链接失败");
      if (!data.authUrl) throw new Error("未获取到微信授权链接");
      setWechatAuthUrl(data.authUrl);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "未知错误";
      toast.error(`加载失败: ${msg}`);
    } finally {
      setWechatLoading(false);
    }
  };

  // const refreshWechatAuth = () => {
  //   setWechatAuthUrl("");
  //   loadWechatAuthUrl();
  // };

  const handleSendEmailCode = useCallback(async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("请输入正确的邮箱地址");
      return;
    }
    try {
      setEmailSending(true);
      const res = await fetch("/api/auth/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "发送失败");
      }
      setEmailCountdown(60);
      toast.success("验证码已发送，请查收邮件");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "发送失败";
      toast.error(msg);
    } finally {
      setEmailSending(false);
    }
  }, [email]);

  const handleEmailLogin = async () => {
    if (!emailCode) {
      toast.error("请输入验证码");
      return;
    }
    try {
      setEmailLogging(true);
      const res = await fetch("/api/auth/email/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: emailCode }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "登录失败");
      }
      onOpenChange(false);
      await checkAuth();
      router.push("/my");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "登录失败";
      toast.error(msg);
    } finally {
      setEmailLogging(false);
    }
  };

  const handleSendSmsCode = useCallback(async () => {
    if (!/^1\d{10}$/.test(phone)) {
      toast.error("请输入正确的手机号");
      return;
    }
    try {
      setSmsSending(true);
      const res = await fetch("/api/auth/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "发送失败");
      }
      setSmsCountdown(60);
      toast.success("验证码已发送");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "发送失败";
      toast.error(msg);
    } finally {
      setSmsSending(false);
    }
  }, [phone]);

  const handleSmsLogin = async () => {
    if (!smsCode) {
      toast.error("请输入验证码");
      return;
    }
    try {
      setSmsLogging(true);
      const res = await fetch("/api/auth/sms/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code: smsCode }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "登录失败");
      }
      onOpenChange(false);
      await checkAuth();
      router.push("/my");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "登录失败";
      toast.error(msg);
    } finally {
      setSmsLogging(false);
    }
  };

  const handleAccountLogin = async () => {
    if (!account.trim()) {
      toast.error("请输入账号");
      return;
    }
    if (!password) {
      toast.error("请输入密码");
      return;
    }
    try {
      setAccountLogging(true);
      const res = await fetch("/api/auth/password/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account: account.trim(), password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "登录失败");
      }
      onOpenChange(false);
      await checkAuth();
      router.push("/my");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "登录失败";
      toast.error(msg);
    } finally {
      setAccountLogging(false);
    }
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  const handlePointerDownOutside: DialogContentProps["onPointerDownOutside"] = (event) => {
    event.preventDefault();
  };

  const AgreementLinks = () => (
    <>
      <Link href="/terms" target="_blank" className="text-indigo-500 hover:underline">用户协议</Link>
      <span>与</span>
      <Link href="/privacy" target="_blank" className="text-indigo-500 hover:underline">隐私政策</Link>
    </>
  );

  const inviteField = (
    <div className="space-y-1">
      <Input
        type="text"
        className="h-10 w-full"
        placeholder="邀请码（选填）"
        value={inviteCode}
        maxLength={6}
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        onChange={(e) => handleInviteChange(e.target.value)}
      />
      <p className="text-[11px] text-slate-400 leading-snug">
        填写好友邀请码，注册后你和好友各得 3 天会员
      </p>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[400px]" onPointerDownOutside={handlePointerDownOutside}>
        <DialogHeader>
          <DialogTitle>用户登录</DialogTitle>
        </DialogHeader>

        <Tabs className="w-full" value={activeTab} onValueChange={handleTabChange}>
          {/* <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="email">邮箱验证码</TabsTrigger>
            <TabsTrigger value="sms">短信验证码</TabsTrigger>
            <TabsTrigger value="wechat">微信扫码</TabsTrigger>
          </TabsList> */}
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="email">邮箱验证码</TabsTrigger>
            <TabsTrigger value="account">账号密码</TabsTrigger>
            <TabsTrigger value="wechat">微信扫码</TabsTrigger>
          </TabsList>

          <TabsContent value="email" className="space-y-4 mt-4">
            <div>
              <Input
                type="email"
                className="h-10 w-full"
                placeholder="请输入邮箱地址"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Input
                type="text"
                className="h-10 w-full"
                placeholder="请输入验证码"
                value={emailCode}
                onChange={(e) => setEmailCode(e.target.value)}
              />
              <Button
                variant="outline"
                className="h-10 whitespace-nowrap cursor-pointer"
                onClick={handleSendEmailCode}
                disabled={emailCountdown > 0 || emailSending}
              >
                {emailSending
                  ? "发送中..."
                  : emailCountdown > 0
                    ? `${emailCountdown}s后重试`
                    : "发送验证码"}
              </Button>
            </div>
            {inviteField}
            <label className="flex items-start gap-2 text-xs text-slate-500 cursor-pointer">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 accent-indigo-500"
              />
              <span>
                我已仔细查看并同意 <AgreementLinks />
              </span>
            </label>
            <Button
              className="h-10 w-full cursor-pointer"
              onClick={handleEmailLogin}
              disabled={emailLogging || !agreed}
            >
              {emailLogging ? "登录中..." : "登录"}
            </Button>
          </TabsContent>

          <TabsContent value="account" className="space-y-4 mt-4">
            <div>
              <Input
                type="text"
                className="h-10 w-full"
                placeholder="请输入账号"
                value={account}
                autoComplete="username"
                onChange={(e) => setAccount(e.target.value)}
              />
            </div>
            <div className="mb-10">
              <Input
                type="password"
                className="h-10 w-full"
                placeholder="请输入密码"
                value={password}
                autoComplete="current-password"
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && accountAgreed) handleAccountLogin();
                }}
              />
            </div>
            <label className="flex items-start gap-2 text-xs text-slate-500 cursor-pointer">
              <input
                type="checkbox"
                checked={accountAgreed}
                onChange={(e) => setAccountAgreed(e.target.checked)}
                className="mt-0.5 accent-indigo-500"
              />
              <span>
                我已仔细查看并同意 <AgreementLinks />
              </span>
            </label>
            <Button
              className="h-10 w-full cursor-pointer"
              onClick={handleAccountLogin}
              disabled={accountLogging || !accountAgreed}
            >
              {accountLogging ? "登录中..." : "登录"}
            </Button>
            <p className="text-xs text-slate-400 text-center">
              账号密码可在登录后于「我的」页面设置
            </p>
          </TabsContent>

          <TabsContent value="sms" className="space-y-4 mt-4">
            <div>
              <Input
                type="tel"
                className="h-10 w-full"
                placeholder="请输入手机号"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div className="flex gap-2 mb-10">
              <Input
                type="text"
                className="h-10 w-full"
                placeholder="请输入验证码"
                value={smsCode}
                onChange={(e) => setSmsCode(e.target.value)}
              />
              <Button
                variant="outline"
                className="h-10 whitespace-nowrap cursor-pointer"
                onClick={handleSendSmsCode}
                disabled={smsCountdown > 0 || smsSending}
              >
                {smsSending
                  ? "发送中..."
                  : smsCountdown > 0
                    ? `${smsCountdown}s后重试`
                    : "发送验证码"}
              </Button>
            </div>
            <label className="flex items-start gap-2 text-xs text-slate-500 cursor-pointer">
              <input
                type="checkbox"
                checked={smsAgreed}
                onChange={(e) => setSmsAgreed(e.target.checked)}
                className="mt-0.5 accent-indigo-500"
              />
              <span>
                我已仔细查看并同意 <AgreementLinks />
              </span>
            </label>
            <Button
              className="h-10 w-full cursor-pointer"
              onClick={handleSmsLogin}
              disabled={smsLogging || !smsAgreed}
            >
              {smsLogging ? "登录中..." : "登录"}
            </Button>
          </TabsContent>

          <TabsContent value="wechat" className="space-y-4">
            {inviteField}
            {!isPC ? (
              <div className="flex flex-col items-center justify-center space-y-4 py-2">
                <p className="text-sm text-slate-600 text-center leading-relaxed">
                  手机浏览器暂不支持微信一键登录，
                  <br />
                  建议使用邮箱验证码登录。
                </p>
                <Button
                  className="h-10 w-full cursor-pointer"
                  onClick={() => setActiveTab("email")}
                >
                  使用邮箱验证码登录
                </Button>
                <div className="flex items-center w-full gap-3 text-xs text-slate-400">
                  <span className="flex-1 h-px bg-slate-200" />
                  <span>或在另一台设备上扫码</span>
                  <span className="flex-1 h-px bg-slate-200" />
                </div>
                {wechatLoading ? (
                  <div className="flex flex-col items-center space-y-2">
                    <div className="w-full h-[200px] bg-slate-100 rounded-lg flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
                    </div>
                  </div>
                ) : wechatAuthUrl ? (
                  <div className="w-full overflow-hidden">
                    <iframe
                      src={wechatAuthUrl}
                      className="w-full h-[260px] border-0"
                      style={{ overflow: "hidden" }}
                      title="微信授权登录"
                      sandbox="allow-same-origin allow-scripts allow-forms allow-top-navigation"
                      onError={() => {
                        toast.error("微信授权页面加载失败");
                      }}
                    />
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    className="cursor-pointer"
                    onClick={loadWechatAuthUrl}
                  >
                    加载二维码
                  </Button>
                )}
                <p className="text-xs text-slate-400 text-center">
                  登录即代表同意 <AgreementLinks />
                </p>
              </div>
            ) : (
            <div className="flex flex-col items-center justify-center space-y-4">
              {wechatLoading ? (
                <div className="flex flex-col items-center space-y-2">
                  <div className="w-full h-96 bg-slate-100 rounded-lg flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
                  </div>
                  <p className="text-sm text-slate-500">正在加载微信授权页面...</p>
                </div>
              ) : wechatAuthUrl ? (
                <div className="flex flex-col items-center space-y-3 w-full">
                  <div className="w-full overflow-hidden">
                    <iframe
                      src={wechatAuthUrl}
                      className="w-full h-[280px] border-0"
                      style={{ overflow: "hidden" }}
                      title="微信授权登录"
                      sandbox="allow-same-origin allow-scripts allow-forms allow-top-navigation"
                      onError={() => {
                        toast.error("微信授权页面加载失败");
                      }}
                    />
                  </div>
                  {/* <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={refreshWechatAuth}
                      className="text-xs cursor-pointer"
                    >
                      刷新
                    </Button>
                  </div> */}
                </div>
              ) : (
                <div className="flex flex-col items-center space-y-2">
                  <div className="w-full h-96 bg-slate-100 rounded-lg flex items-center justify-center">
                    <p className="text-sm text-slate-500">点击刷新加载微信授权页面</p>
                  </div>
                  <Button
                    className="bg-emerald-500 hover:bg-emerald-600"
                    onClick={loadWechatAuthUrl}
                  >
                    加载微信登录
                  </Button>
                </div>
              )}
              <p className="text-xs text-slate-400 text-center">
                登录即代表同意 <AgreementLinks />
              </p>
            </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
