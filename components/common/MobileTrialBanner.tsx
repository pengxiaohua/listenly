"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, ChevronRight } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import TrialMemberDialog from "@/components/common/TrialMemberDialog";

type BannerState =
  | "trial-eligible"
  | "trial-active"
  | "trial-expired"
  | "formal-expired";

type UserInfo = NonNullable<ReturnType<typeof useAuthStore.getState>["userInfo"]>;

function getBannerState(userInfo: UserInfo): BannerState | null {
  if (userInfo.isPro && userInfo.memberPlan !== "trial") return null;
  if (userInfo.isPro && userInfo.memberPlan === "trial") return "trial-active";
  if (!userInfo.hasUsedTrial) return "trial-eligible";
  if (userInfo.hasFormalMembershipHistory) return "formal-expired";
  return "trial-expired";
}

function formatCountdown(expiresAt: string): string | null {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return null;

  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);

  if (days > 0) return `${days}天${hours}时${minutes}分`;
  if (hours > 0) return `${hours}时${minutes}分${seconds}秒`;
  return `${minutes}分${seconds}秒`;
}

function useMembershipCountdown(
  expiresAt: string | null,
  onExpire?: () => void
) {
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    if (!expiresAt) return;

    const tick = () => {
      const formatted = formatCountdown(expiresAt);
      setText(formatted);
      if (!formatted) onExpire?.();
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt, onExpire]);

  return text;
}

const bannerClassName =
  "w-full sticky top-0 z-40 lg:relative bg-[url('/images/top.png')] bg-cover bg-center bg-no-repeat text-white px-4 py-2 flex items-center justify-center gap-2 text-sm font-medium";

/**
 * 顶部贯穿条形式的会员提示（所有屏幕宽度统一展示）。
 */
const MobileTrialBanner = () => {
  const router = useRouter();
  const isLogged = useAuthStore((s) => s.isLogged);
  const userInfo = useAuthStore((s) => s.userInfo);
  const fetchUserInfo = useAuthStore((s) => s.fetchUserInfo);
  const [open, setOpen] = useState(false);

  const handleExpire = useCallback(() => {
    void fetchUserInfo();
  }, [fetchUserInfo]);

  const countdown = useMembershipCountdown(
    userInfo?.membershipExpiresAt ?? null,
    handleExpire
  );

  if (!isLogged || !userInfo) return null;

  const bannerState = getBannerState(userInfo);
  if (!bannerState) return null;

  if (bannerState === "trial-eligible") {
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen(true)}
          data-mobile-trial-banner
          aria-label="试用会员"
          className={`${bannerClassName} cursor-pointer`}
        >
          <Sparkles className="size-4 shrink-0" />
          <span>免费试用会员 3 天，体验全部功能</span>
          <ChevronRight className="size-4 shrink-0" />
        </button>

        <TrialMemberDialog open={open} onOpenChange={setOpen} />
      </>
    );
  }

  if (bannerState === "trial-active") {
    return (
      <div
        data-mobile-trial-banner
        className={`${bannerClassName} justify-between`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="size-4 shrink-0" />
          <span className="truncate">
            试用会员剩余 {countdown ?? "计算中..."}
          </span>
        </div>
        <button
          type="button"
          onClick={() => router.push("/vip")}
          className="flex items-center gap-1 shrink-0 cursor-pointer underline underline-offset-2"
        >
          购买会员
          <ChevronRight className="size-4" />
        </button>
      </div>
    );
  }

  if (bannerState === "trial-expired") {
    return (
      <button
        type="button"
        onClick={() => router.push("/vip")}
        data-mobile-trial-banner
        aria-label="购买正式会员"
        className={`${bannerClassName} cursor-pointer`}
      >
        <span>「试用会员」已过期，可以前往购买正式会员</span>
        <ChevronRight className="size-4 shrink-0" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => router.push("/vip")}
      data-mobile-trial-banner
      aria-label="续费会员"
      className={`${bannerClassName} cursor-pointer`}
    >
      <span>会员已过期，可以前往续费会员</span>
      <ChevronRight className="size-4 shrink-0" />
    </button>
  );
};

export default MobileTrialBanner;
