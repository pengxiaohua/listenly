"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface LiquidTabItem {
  value: string;
  label: string;
  shortLabel?: string;
  icon?: LucideIcon;
}

// labelMode: "full" = icon+完整文字, "short" = icon+短文字, "icon" = 仅icon, "icon-label" = icon上+短文字下(竖排)
type LabelMode = "full" | "short" | "icon" | "icon-label";

interface LiquidTabsProps {
  items: LiquidTabItem[];
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
  itemClassName?: string;
  align?: "left" | "center" | "right";
  size?: "sm" | "md" | "lg" | "xl";
  labelMode?: LabelMode;
  id?: string;
}

export function LiquidTabs({
  items,
  value,
  onValueChange,
  className,
  itemClassName,
  align = "left",
  size = "md",
  labelMode = "full",
  id,
}: LiquidTabsProps) {
  const alignClass = {
    left: "justify-start",
    center: "justify-center",
    right: "justify-end",
  }[align];

  const sizeConfig = {
    sm: { container: "p-0.5", button: "px-3 py-1", text: "text-xs", icon: "size-3" },
    md: { container: "p-1", button: "px-3 py-1.5", text: "text-sm", icon: "size-4" },
    lg: { container: "p-1.5", button: "px-4 py-2", text: "text-base", icon: "size-4" },
    xl: { container: "p-2", button: "px-4 py-2.5", text: "text-base", icon: "size-5" },
  };

  const currentSize = sizeConfig[size];

  // icon-only / icon-label 模式下调整按钮 padding
  const buttonPadding =
    labelMode === "icon" ? "px-3 py-2" :
    labelMode === "icon-label" ? "px-2 py-1" :
    currentSize.button;

  return (
    <div className={cn("flex", alignClass)}>
      <div
        className={cn(
          "relative flex bg-slate-200/80 dark:bg-slate-800/30 backdrop-blur-2xl rounded-full border border-white/20 dark:border-white/5 shadow-[inset_0_0_15px_rgba(255,255,255,0.5)] dark:shadow-[inset_0_0_15px_rgba(0,0,0,0.5)]",
          currentSize.container,
          className
        )}
      >
        {items.map((item) => {
          const isActive = value === item.value;
          const Icon = item.icon;
          const displayLabel =
            labelMode === "icon" || labelMode === "icon-label"
              ? null
              : labelMode === "short" && item.shortLabel
                ? item.shortLabel
                : item.label;
          const iconLabel = labelMode === "icon-label" ? (item.shortLabel || item.label) : null;

          return (
            <button
              key={item.value}
              onClick={() => onValueChange(item.value)}
              title={item.label}
              className={cn(
                "relative font-semibold transition-colors duration-300 rounded-full select-none z-10 flex items-center gap-1.5 cursor-pointer",
                buttonPadding,
                currentSize.text,
                isActive
                  ? "text-indigo-600 dark:text-indigo-400"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200",
                itemClassName
              )}
            >
              {isActive && (
                <motion.div
                  layoutId={`activeLiquidTab-${id || size}`}
                  className={cn(
                    "absolute inset-0 shadow-[0_4px_10px_rgba(0,0,0,0.1)] backdrop-blur-md rounded-full z-[-1] border border-white/40 dark:border-white/10",
                    "bg-white dark:bg-slate-700"
                  )}
                  transition={{ type: "spring", bounce: 0.25, duration: 0.6 }}
                >
                  <div className="absolute inset-x-2 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/80 to-transparent opacity-70" />
                  <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent opacity-50 rounded-full" />
                </motion.div>
              )}
              <span className={cn(
                "relative z-10 transition-all duration-300 flex items-center",
                labelMode === "icon-label" ? "flex-col gap-0.5" : "gap-1.5"
              )}>
                {Icon && <Icon className={currentSize.icon} />}
                {displayLabel}
                {iconLabel && <span className="text-[10px] leading-tight">{iconLabel}</span>}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
