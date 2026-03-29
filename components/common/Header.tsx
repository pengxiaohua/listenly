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
import { useAuthStore } from "@/store/auth";
import {
  MessageCircleMore, House, Smile, BookA, NotebookText, Mic, LockKeyhole, BookOpen,
  Crown, Clapperboard, Sparkles
} from "lucide-react";
import { LiquidTabs } from "@/components/ui/liquid-tabs";
import TrialMemberDialog from "@/components/common/TrialMemberDialog";

const Header = () => {
  const pathname = usePathname();
  const router = useRouter();
  const isLogged = useAuthStore(state => state.isLogged);
  const logout = useAuthStore(state => state.logout);
  const setShowLoginDialog = useAuthStore(state => state.setShowLoginDialog);
  const userInfo = useAuthStore(state => state.userInfo);
  const [open, setOpen] = useState(false);
  const [trialDialogOpen, setTrialDialogOpen] = useState(false);
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
    // 只有未登录时才显示首页和博客
    ...(!isLogged ? [{ href: "/", label: "首页", shortLabel: "首页", icon: House }] : []),
    ...(!isLogged ? [{ href: "/blog", label: "博客", shortLabel: "博客", icon: BookOpen }] : []),
    ...(isLogged ? [{ href: "/my", label: "我的", shortLabel: "我的", icon: Smile }] : []),
    { href: "/word", label: "单词拼写", shortLabel: "单词", icon: BookA },
    { href: "/sentence", label: "句子听写", shortLabel: "句子", icon: NotebookText },
    { href: "/shadowing", label: "影子跟读", shortLabel: "跟读", icon: Mic },
    { href: "/video", label: "视听演练", shortLabel: "视听", icon: Clapperboard },
    { href: "/vip", label: "会员", shortLabel: "会员", icon: Crown },
    ...(userInfo?.isAdmin ? [{ href: "/admin", label: "后台管理", shortLabel: "后台", icon: LockKeyhole }] : []),
  ];

  // 处理导航切换
  const handleNavChange = (value: string) => {
    router.push(value);
  };

  return (
    <header className="border-b bg-background sticky top-0 z-40 w-full px-2 md:px-0">
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
              className="w-[30px] h-[30px] md:w-[40px] md:h-[40px]"
            />
          </div>
          <div className="hidden lg:flex flex-col">
            <h1 className="text-3xl font-extrabold text-black dark:text-slate-100 flex items-center">
              Listenly
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
            {/* <p className="text-xs font-semibold text-primary slogan hidden sm:block">Listen Daily, Up Greatly</p> */}
          </div>
        </div>

        {/* 手机端导航：仅 icon（md 以下显示），可横向滚动 */}
        <div className="hidden max-md:flex flex-1 mx-2 overflow-x-auto scrollbar-hide">
          <LiquidTabs
            items={navItems.map(item => ({
              value: item.href,
              label: item.label,
              shortLabel: item.shortLabel,
              icon: item.icon,
            }))}
            className="bg-transparent flex-nowrap"
            value={pathname}
            onValueChange={handleNavChange}
            size="md"
            labelMode="icon"
            align="center"
          />
        </div>

        {/* 平板端导航：icon + 短文字（md~lg 显示） */}
        <div className="hidden md:flex lg:hidden">
          <LiquidTabs
            items={navItems.map(item => ({
              value: item.href,
              label: item.label,
              shortLabel: item.shortLabel,
              icon: item.icon,
            }))}
            className="bg-transparent"
            value={pathname}
            onValueChange={handleNavChange}
            size="lg"
            labelMode="short"
            align="center"
          />
        </div>

        {/* PC 端导航：icon + 完整文字（lg 以上显示） */}
        <div className="hidden lg:flex">
          <LiquidTabs
            items={navItems.map(item => ({
              value: item.href,
              label: item.label,
              shortLabel: item.shortLabel,
              icon: item.icon,
            }))}
            className="bg-transparent"
            value={pathname}
            onValueChange={handleNavChange}
            size="xl"
            align="center"
          />
        </div>

        {/* 右侧微信群和用户头像 */}
        <div className="flex items-center gap-2">
          {/* 试用会员按钮：登录且非会员时显示 */}
          {isLogged && !userInfo?.isPro && (
            <button
              onClick={() => setTrialDialogOpen(true)}
              data-tour="trial-member"
              className="flex items-center gap-1 border border-indigo-400 text-indigo-500 rounded-full px-1 sm-px-3 py-1 text-xs sm:text-sm hover:bg-indigo-50 dark:hover:bg-orange-900/20 transition-colors cursor-pointer"
            >
              <Sparkles className="size-3.5 hidden sm:block" />
              <span>试用会员</span>
            </button>
          )}
          {isLogged && <div
            className="relative group flex items-center"
            data-tour="wechat-group"
            onMouseEnter={fetchWechatQr}
          >
            <div className="hidden cursor-pointer lg:flex items-center border border-slate-600 rounded-full px-2 py-1">
              <MessageCircleMore className="size-4" />
              <span className="ml-1 text-sm text-slate-600 dark:text-slate-50">微信群</span>
            </div>
            {wechatQr && (
              <div className="absolute top-full right-0 mt-2 w-48 p-2 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 hidden group-hover:block z-50">
                <div className="text-center text-base mb-2 font-bold text-slate-600 dark:text-slate-300">扫码进群，反馈问题</div>
                <div className="relative aspect-square w-full bg-white rounded-md overflow-hidden">
                  <Image src={wechatQr} alt="WeChat QR" fill className="object-contain" />
                </div>
              </div>
            )}
            {isLoadingQr && !wechatQr && (
              <div className="absolute top-full right-0 mt-2 w-48 p-2 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 hidden group-hover:block z-50">
                <div className="text-center text-base mb-2 font-bold text-slate-600 dark:text-slate-300">加载中...</div>
              </div>
            )}
          </div>}
          {isLogged ? <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar className="w-[30px] h-[30px] md:w-[40px] md:h-[40px]">
                  <Image src={userInfo?.avatar || '/images/avatar.jpeg'} alt={userInfo?.userName || '用户头像'} width={40} height={40} className="w-[30px] h-[30px] md:w-[40px] md:h-[40px] cursor-pointer" />
                  <AvatarFallback>{userInfo?.userName?.[0] || '用户'}</AvatarFallback>
                </Avatar>
                {userInfo?.isPro && (
                  <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center">
                    <Crown className="w-1.5 h-1.5 text-white" />
                  </div>
                )}
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
          : <Button className="cursor-pointer relative px-3 sm:px-5 py-1 rounded-full text-sm sm:text-base" onClick={() => setShowLoginDialog(true)}>
            登录
          </Button>
          }
        </div>
      </div>

      <TrialMemberDialog open={trialDialogOpen} onOpenChange={setTrialDialogOpen} />
    </header>
  );
}

export default Header;
