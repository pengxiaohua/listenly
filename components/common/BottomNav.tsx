"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  House,
  Smile,
  BookA,
  NotebookText,
  Mic,
  Crown,
  Clapperboard,
  BookOpen,
  type LucideIcon,
} from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
}

// 一级路径白名单：只有完全匹配这些路径时才视为一级页面
const ROOT_PATHS = new Set<string>([
  "/",
  "/blog",
  "/my",
  "/word",
  "/sentence",
  "/shadowing",
  "/video",
  "/vip",
]);

type Size = "lg" | "sm" | null;

const BottomNav = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const isLogged = useAuthStore((state) => state.isLogged);

  const [size, setSize] = useState<Size>(null);

  useEffect(() => {
    const compute = () => {
      const w = window.innerWidth;
      // 与 Tailwind 的 `lg` 断点 (>=1024px) 对齐：>=1024 由顶部 Header 接管
      if (w >= 1024) setSize(null);
      else if (w > 750) setSize("lg");
      else setSize("sm");
    };
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, []);

  const navItems: NavItem[] = [
    ...(!isLogged
      ? [{ href: "/", label: "首页", shortLabel: "首页", icon: House }]
      : []),
    ...(!isLogged
      ? [{ href: "/blog", label: "博客", shortLabel: "博客", icon: BookOpen }]
      : []),
    ...(isLogged
      ? [{ href: "/my", label: "我的", shortLabel: "我的", icon: Smile }]
      : []),
    { href: "/word", label: "单词拼写", shortLabel: "单词", icon: BookA },
    { href: "/sentence", label: "句子听写", shortLabel: "句子", icon: NotebookText },
    { href: "/shadowing", label: "影子跟读", shortLabel: "跟读", icon: Mic },
    { href: "/video", label: "视听演练", shortLabel: "视听", icon: Clapperboard },
    { href: "/vip", label: "会员", shortLabel: "会员", icon: Crown },
  ];

  // 是否处于二级页面（隐藏底部导航）
  const isSecondaryPage = (() => {
    // 1. 路径不在一级白名单中即视为二级（如 /blog/[slug]、/video/[id]、/my/assessment）
    if (!ROOT_PATHS.has(pathname)) return true;
    // 2. /word、/sentence、/shadowing 通过 query 进入了具体的集合 / 分组练习
    const PRACTICE_PATHS = new Set(["/word", "/sentence", "/shadowing"]);
    if (PRACTICE_PATHS.has(pathname)) {
      const inSet =
        searchParams.get("set") ||
        searchParams.get("sentenceSet") ||
        searchParams.get("slug") ||
        searchParams.get("id") ||
        searchParams.get("group") ||
        searchParams.get("groupId");
      if (inSet) return true;
    }
    return false;
  })();

  const visible = !!size && !isSecondaryPage;

  // 通过 body class 通知样式层为页面预留底部留白，避免悬浮导航遮挡内容
  useEffect(() => {
    if (visible) {
      document.body.classList.add("with-bottom-nav");
    } else {
      document.body.classList.remove("with-bottom-nav");
    }
    return () => {
      document.body.classList.remove("with-bottom-nav");
    };
  }, [visible]);

  if (!visible) return null;

  // 当前激活项：精确匹配优先，其次匹配前缀（兼容子路径但本组件并不会在子路径下显示，主要用于一级路径判断）
  const activeItem =
    navItems.find((it) => it.href === pathname) ??
    navItems.find((it) => it.href !== "/" && pathname.startsWith(`${it.href}/`));

  const isLg = size === "lg";

  return (
    <nav
      data-bottom-nav
      className={cn(
        "fixed left-1/2 -translate-x-1/2 z-50 lg:hidden",
        "px-3",
        isLg ? "bottom-4" : "bottom-3",
      )}
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="移动端导航"
    >
      <div
        className={cn(
          "relative flex items-stretch",
          "rounded-full",
          // Liquid Glass：更低不透明度 + 强模糊 + 高饱和，让下方背景透出更多
          "bg-white/25 dark:bg-slate-900/25",
          "backdrop-blur-3xl backdrop-saturate-200",
          "border border-white/40 dark:border-white/10",
          // 外发光阴影 + 极淡描边
          "shadow-[0_10px_30px_rgba(15,23,42,0.18)]",
          "ring-1 ring-black/5 dark:ring-white/5",
          // 内顶光
          "before:pointer-events-none before:absolute before:inset-x-3 before:top-0 before:h-px",
          "before:bg-gradient-to-r before:from-transparent before:via-white/70 before:to-transparent",
          isLg ? "p-2 gap-1" : "p-1.5 gap-0.5",
        )}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeItem?.href === item.href;

          return (
            <button
              key={item.href}
              type="button"
              onClick={() => router.push(item.href)}
              title={item.label}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "relative flex flex-col items-center justify-center select-none cursor-pointer rounded-full",
                "transition-colors duration-200",
                "z-10",
                isLg
                  ? "min-w-[64px] px-3 py-2 gap-1"
                  : "min-w-[52px] px-2 py-1.5 gap-0.5",
                isActive
                  ? "text-indigo-600 dark:text-indigo-400"
                  : "text-slate-700/80 dark:text-slate-300/90",
              )}
            >
              {isActive && (
                <motion.span
                  layoutId="bottom-nav-active-bubble"
                  className={cn(
                    "absolute inset-0 rounded-full -z-10",
                    "bg-white/85 dark:bg-slate-700/70",
                    "backdrop-blur-md",
                    "border border-white/60 dark:border-white/10",
                    "shadow-[0_4px_14px_rgba(15,23,42,0.12)]",
                  )}
                  transition={{ type: "spring", bounce: 0.22, duration: 0.55 }}
                >
                  <span className="absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent" />
                  <span className="absolute inset-0 rounded-full bg-gradient-to-b from-white/40 to-transparent dark:from-white/10" />
                </motion.span>
              )}
              <Icon
                className={cn(
                  "shrink-0",
                  isLg ? "size-[22px]" : "size-[20px]",
                )}
                strokeWidth={isActive ? 2.4 : 2}
              />
              <span
                className={cn(
                  "leading-none font-medium",
                  isLg ? "text-[12px]" : "text-[10px]",
                )}
              >
                {item.shortLabel}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
