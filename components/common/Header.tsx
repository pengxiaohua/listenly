"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth";
import { Menu, X, MessageCircleMore, House, Smile, WholeWord, NotebookText, Mic, LockKeyhole, Crown } from "lucide-react";
import { LiquidTabs } from "@/components/ui/liquid-tabs";

const Header = () => {
  const pathname = usePathname();
  const router = useRouter();
  const isLogged = useAuthStore(state => state.isLogged);
  const logout = useAuthStore(state => state.logout);
  const setShowLoginDialog = useAuthStore(state => state.setShowLoginDialog);
  const userInfo = useAuthStore(state => state.userInfo);
  const [open, setOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [wechatQr, setWechatQr] = useState<string | null>(null);
  const [isLoadingQr, setIsLoadingQr] = useState(false);

  // 检查是否是12月（圣诞节期间）
  const isDecember = new Date().getMonth() === 11;

  // 获取微信群二维码
  const fetchWechatQr = async () => {
    // 如果已经有二维码且正在加载，则不重复请求
    if (isLoadingQr) return;

    setIsLoadingQr(true);
    try {
      const res = await fetch('/api/config?key=wechat_group_qr');
      const data = await res.json();
      if (data?.content && data?.type === 'image') {
        setWechatQr(data.content);
      }
    } catch (err) {
      console.error('Failed to fetch WeChat QR:', err);
    } finally {
      setIsLoadingQr(false);
    }
  };

  // 处理退出登录
  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  // 导航项配置
  const navItems = [
    // 只有未登录时才显示首页
    ...(!isLogged ? [{ href: "/", label: "首页", icon: House }] : []),
    { href: "/my", label: "我的", icon: Smile },
    { href: "/word", label: "单词拼写", icon: WholeWord },
    { href: "/sentence", label: "句子听写", icon: NotebookText },
    { href: "/shadowing", label: "影子跟读", icon: Mic },
    { href: "/vip", label: "会员", icon: Crown },
    ...(userInfo?.isAdmin ? [{ href: "/admin", label: "后台管理", icon: LockKeyhole }] : []),
  ];

  // 处理导航切换
  const handleNavChange = (value: string) => {
    router.push(value);
  };

  return (
    <header className="border-b bg-background sticky top-0 z-40 w-full">
      <div className="container m-auto flex h-16 items-center justify-between py-4">
        {/* 左侧 Logo 和站点信息 */}
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/')}>
          <div className="relative">
            {isDecember && (
              <>
                {/* 圣诞帽 - 弯曲帽尾样式 */}
                <div className="absolute -top-5 left-6 rotate-45 z-10 pointer-events-none">
                  <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {/* 帽子红色主体 - 调整形状，更饱满 */}
                    <path d="M8 28 C 8 28, 12 4, 32 12 C 32 12, 28 18, 22 18 C 18 18, 18 18, 22 28 Z" fill="#DC2626" />
                    {/* 白色帽檐 - 带灰色描边 */}
                    <path d="M6 28 H 24 A 2 2 0 0 1 26 30 V 32 A 2 2 0 0 1 24 34 H 6 A 2 2 0 0 1 4 32 V 30 A 2 2 0 0 1 6 28 Z" fill="#FFFFFF" stroke="#E5E7EB" strokeWidth="1" />
                    {/* 白色绒球 - 带灰色描边 */}
                    <circle cx="32" cy="12" r="3.5" fill="#FFFFFF" stroke="#E5E7EB" strokeWidth="1" />
                  </svg>
                </div>
                {/* 雪花装饰 - 右下角点缀 */}
                <div className="absolute -bottom-1 -right-2 z-10 pointer-events-none">
                   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                     <path d="M12 2V22M2 12H22M5 5L19 19M5 19L19 5" stroke="#93C5FD" strokeWidth="2.5" strokeLinecap="round" />
                   </svg>
                </div>
              </>
            )}
            <Image
              src="/images/logo.png"
              alt="Listenly Logo"
              width={40}
              height={40}
            />
          </div>
          <div className="flex flex-col">
            <h1 className="text-2xl md:text-3xl font-extrabold text-primary flex items-center">
              LISTENLY
              {isDecember && (
                /* 圣诞树装饰 */
                <span className="ml-1 mt-1.5 inline-flex items-center">
                  <svg width="24" height="30" viewBox="0 0 24 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {/* 树干 */}
                    <rect x="10" y="24" width="4" height="6" fill="#8B4513" />
                    {/* 树叶 - 三层，覆盖树干顶部 */}
                    <path d="M12 2 L4 10 H8 L2 16 H22 L16 10 H20 L12 2 Z" fill="#22C55E" />
                    <path d="M12 8 L4 16 H8 L2 24 H22 L16 16 H20 L12 8 Z" fill="#22C55E" />

                    {/* 装饰球 */}
                    <circle cx="8" cy="12" r="1.5" fill="#EF4444" />
                    <circle cx="16" cy="14" r="1.5" fill="#3B82F6" />
                    <circle cx="10" cy="18" r="1.5" fill="#FCD34D" />
                    <circle cx="14" cy="20" r="1.5" fill="#EF4444" />

                    {/* 顶部星星 */}
                    <path d="M12 0 L13.5 3 L17 3.5 L14.5 6 L15 9.5 L12 8 L9 9.5 L9.5 6 L7 3.5 L10.5 3 L12 0 Z" fill="#FCD34D" />
                  </svg>
                </span>
              )}
            </h1>
            <p className="text-xs font-semibold text-primary slogan hidden sm:block">Listen Daily, Up Greatly</p>
          </div>
        </div>

        {/* 桌面端导航 */}
        <div className="hidden md:flex">
          <LiquidTabs
            items={navItems.map(item => ({
              value: item.href,
              label: item.label,
              icon: item.icon,
            }))}
            className="bg-transparent"
            value={pathname}
            onValueChange={handleNavChange}
            size="xl"
            align="center"
          />
        </div>

        {/* 移动端菜单按钮 */}
        <div className="md:hidden">
          <Button
            variant="ghost"
            size="lg"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2"
          >
            {mobileMenuOpen ? <X className="size-6" /> : <Menu className="size-6" />}
          </Button>
        </div>

        {/* 右侧微信群和用户头像 */}
        <div className="flex items-center gap-2">
          <div
            className="relative group flex items-center"
            onMouseEnter={fetchWechatQr}
          >
            <div className="sm:flex cursor-pointer flex items-center border border-gray-600 rounded-full px-2 py-1">
              <MessageCircleMore className="size-4" />
              <span className="ml-1 text-sm text-gray-600 dark:text-gray-50">微信群</span>
            </div>
            {wechatQr && (
              <div className="absolute top-full right-0 mt-2 w-48 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 hidden group-hover:block z-50">
                <div className="text-center text-base mb-2 font-bold text-gray-600 dark:text-gray-300">扫码进群，反馈问题</div>
                <div className="relative aspect-square w-full bg-white rounded-md overflow-hidden">
                  <Image src={wechatQr} alt="WeChat QR" fill className="object-contain" />
                </div>
              </div>
            )}
            {isLoadingQr && !wechatQr && (
              <div className="absolute top-full right-0 mt-2 w-48 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 hidden group-hover:block z-50">
                <div className="text-center text-base mb-2 font-bold text-gray-600 dark:text-gray-300">加载中...</div>
              </div>
            )}
          </div>
          {isLogged ? <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <Image src={userInfo?.avatar || '/images/avatar.jpeg'} alt={userInfo?.userName || '用户头像'} className="cursor-pointer" width={32} height={32} />
                  <AvatarFallback>{userInfo?.userName?.[0] || '用户'}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-[70px]"
              align="center"
              forceMount
              onMouseEnter={() => setOpen(true)}
              onMouseLeave={() => setOpen(false)}
            >
              <DropdownMenuItem>
                <Link href="/my?tab=profile" className="w-full text-center">个人中心</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <button className="w-full cursor-pointer text-center" onClick={handleLogout}>
                  退出登录
                </button>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          : <Button variant="ghost" className="cursor-pointer relative h-8 w-8 rounded-full hidden sm:flex" onClick={() => setShowLoginDialog(true)}>
            登录
          </Button>
          }
        </div>
      </div>

      {/* 移动端下拉菜单 */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t bg-background text-center">
          <div className="container m-auto py-4 space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                    className={cn(
                      "relative block px-4 py-2 text-sm font-medium rounded-md transition-colors hover:bg-accent",
                      pathname === item.href && "bg-accent text-accent-foreground"
                    )}
                onClick={() => setMobileMenuOpen(false)}
              >
                    {item.label}
                    {/* {item.href === "/shadowing" && (
                      <span className="ml-2 align-middle text-[8px] px-1.5 py-1 rounded-full bg-red-500 text-white">NEW</span>
                    )} */}
              </Link>
            ))}

            {/* 移动端登录按钮 */}
            {!isLogged && (
              <Button
                variant="ghost"
                className="w-full justify-start px-4 py-2 h-auto font-medium"
                onClick={() => {
                  setShowLoginDialog(true);
                  setMobileMenuOpen(false);
                }}
              >
                登录
              </Button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

export default Header;
