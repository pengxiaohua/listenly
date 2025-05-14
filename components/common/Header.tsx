"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

const Header = () => {
  const pathname = usePathname();

  // 导航项配置
  const navItems = [
    { href: "/", label: "首页" },
    { href: "/spell", label: "单词拼写" },
    { href: "/dictation", label: "句子听抄" },
    { href: "/my", label: "我的数据" },
  ];

  return (
    <header className="border-b bg-background sticky top-0 z-40 w-full">
      <div className="container m-auto flex h-16 items-center justify-between py-4">
        {/* 左侧 Logo 和站点信息 */}
        <div className="flex items-center gap-2">
          <Image
            src="/logo.png"
            alt="Listenly Logo"
            width={40}
            height={40}
          />
          <div className="flex flex-col">
            <h1 className="text-3xl font-extrabold text-primary">LISTENLY</h1>
            <p className="text-xs font-semibold text-primary slogan">Listen Daily, Up Greatly</p>
          </div>
        </div>

        {/* 中间导航 */}
        <NavigationMenu>
          <NavigationMenuList>
            {navItems.map((item) => (
              <NavigationMenuItem key={item.href}>
                <Link href={item.href} legacyBehavior passHref>
                  <NavigationMenuLink
                    className={cn(
                      navigationMenuTriggerStyle(),
                      pathname === item.href && "bg-primary text-primary-foreground font-medium"
                    )}
                  >
                    {item.label}
                  </NavigationMenuLink>
                </Link>
              </NavigationMenuItem>
            ))}
          </NavigationMenuList>
        </NavigationMenu>

        {/* 右侧主题切换和用户头像 */}
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="avatar.jpeg" alt="用户头像" />
                  <AvatarFallback>用户</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuItem>
                <Link href="/profile" className="w-full">修改信息</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <button className="w-full text-left" onClick={() => console.log("退出登录")}>
                  退出登录
                </button>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

export default Header;
