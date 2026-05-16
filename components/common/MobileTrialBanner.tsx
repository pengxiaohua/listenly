"use client";

import { useState } from "react";
import { Sparkles, ChevronRight } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import TrialMemberDialog from "@/components/common/TrialMemberDialog";

/**
 * 顶部贯穿条形式的"试用会员"入口（所有屏幕宽度统一展示）。
 * 显示时机：
 *   - 已登录
 *   - 非会员（含已退订状态）
 *   - 未享受过任何会员功能（无任何已支付订单 → !hasUsedTrial）
 */
const MobileTrialBanner = () => {
  const isLogged = useAuthStore((s) => s.isLogged);
  const userInfo = useAuthStore((s) => s.userInfo);
  const [open, setOpen] = useState(false);

  const visible =
    isLogged &&
    !userInfo?.isPro &&
    !userInfo?.hasUsedTrial;

  if (!visible) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-mobile-trial-banner
        aria-label="试用会员"
        className="w-full sticky top-0 z-40 lg:relative bg-indigo-500 text-white px-4 py-2 flex items-center justify-center gap-2 text-sm font-medium cursor-pointer hover:bg-indigo-600 active:bg-indigo-700 transition-colors"
      >
        <Sparkles className="size-4 shrink-0" />
        <span>免费试用会员 3 天，体验全部功能</span>
        <ChevronRight className="size-4 shrink-0" />
      </button>

      <TrialMemberDialog open={open} onOpenChange={setOpen} />
    </>
  );
};

export default MobileTrialBanner;
