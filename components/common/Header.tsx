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
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { useAuthStore } from "@/store/auth";
import { Menu, X } from "lucide-react";

const Header = () => {
  const pathname = usePathname();
  const router = useRouter();
  const isLogged = useAuthStore(state => state.isLogged);
  const logout = useAuthStore(state => state.logout);
  const setShowLoginDialog = useAuthStore(state => state.setShowLoginDialog);
  const userInfo = useAuthStore(state => state.userInfo);
  const [open, setOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // 处理退出登录
  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  // 导航项配置
  const navItems = [
    // 只有未登录时才显示首页
    ...(!isLogged ? [{ href: "/", label: "首页" }] : []),
    { href: "/word", label: "单词拼写" },
    { href: "/sentence", label: "句子听写" },
    { href: "/shadowing", label: "影子跟读" },
    { href: "/my", label: "我的" },
    ...(userInfo?.isAdmin ? [{ href: "/admin", label: "后台管理" }] : []),
  ];

  return (
    <header className="border-b bg-background sticky top-0 z-40 w-full">
      <div className="container m-auto flex h-16 items-center justify-between py-4 px-4">
        {/* 左侧 Logo 和站点信息 */}
        <div className="flex items-center gap-2">
          <Image
            src="/logo.png"
            alt="Listenly Logo"
            width={40}
            height={40}
          />
          <div className="flex flex-col">
            <h1 className="text-2xl md:text-3xl font-extrabold text-primary">LISTENLY</h1>
            <p className="text-xs font-semibold text-primary slogan hidden sm:block">Listen Daily, Up Greatly</p>
          </div>
        </div>

        {/* 桌面端导航 */}
        <NavigationMenu className="hidden md:flex">
          <NavigationMenuList>
            {navItems.map((item) => (
              <NavigationMenuItem key={item.href}>
                <Link href={item.href} legacyBehavior passHref>
                  <NavigationMenuLink
                    className={cn(
                      navigationMenuTriggerStyle(),
                      "relative hover:bg-transparent hover:text-foreground",
                      pathname === item.href && "after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2 after:h-1 after:w-8 after:bg-primary after:rounded-full"
                    )}
                  >
                    {item.label}
                  </NavigationMenuLink>
                </Link>
              </NavigationMenuItem>
            ))}
          </NavigationMenuList>
        </NavigationMenu>

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

        {/* 右侧主题切换和用户头像 */}
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {isLogged ? <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <Image src={userInfo?.avatar || '/avatar.jpeg'} alt={userInfo?.userName || '用户头像'} className="cursor-pointer" width={32} height={32} />
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
                  "block px-4 py-2 text-sm font-medium rounded-md transition-colors hover:bg-accent",
                  pathname === item.href && "bg-accent text-accent-foreground"
                )}
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.label}
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
