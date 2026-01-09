"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface LiquidTabItem {
  value: string;
  label: string;
}

interface LiquidTabsProps {
  items: LiquidTabItem[];
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
  itemClassName?: string;
  align?: 'left' | 'center' | 'right';
  size?: 'sm' | 'md' | 'lg';
  id?: string;
}

export function LiquidTabs({
  items,
  value,
  onValueChange,
  className,
  itemClassName,
  align = 'left',
  size = 'md',
  id,
}: LiquidTabsProps) {
  const alignClass = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
  }[align];

  const sizeConfig = {
    sm: {
      container: 'p-0.5',
      button: 'px-3 py-1',
      text: 'text-xs',
    },
    md: {
      container: 'p-1',
      button: 'px-4 py-1.5',
      text: 'text-sm',
    },
    lg: {
      container: 'p-1.5',
      button: 'px-6 py-2',
      text: 'text-base',
    },
  };

  const currentSize = sizeConfig[size];

  return (
    <div className={cn("flex", alignClass, className)}>
      <div className={cn(
        "relative flex bg-gray-200/80 dark:bg-gray-800/30 backdrop-blur-2xl rounded-full border border-white/20 dark:border-white/5 shadow-[inset_0_0_15px_rgba(255,255,255,0.5)] dark:shadow-[inset_0_0_15px_rgba(0,0,0,0.5)]",
        currentSize.container
      )}>
        {items.map((item) => {
          const isActive = value === item.value;
          return (
            <button
              key={item.value}
              onClick={() => onValueChange(item.value)}
              className={cn(
                "relative font-semibold transition-colors duration-300 rounded-full select-none z-10",
                currentSize.button,
                currentSize.text,
                isActive
                  ? "text-black dark:text-white"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200",
                itemClassName
              )}
            >
              {isActive && (
                <motion.div
                  layoutId={`activeLiquidTab-${id || size}`}
                  className={cn(
                    "absolute inset-0 shadow-[0_4px_10px_rgba(0,0,0,0.1)] backdrop-blur-md rounded-full z-[-1] border border-white/40 dark:border-white/10",
                    "bg-white dark:bg-gray-700"
                  )}
                  transition={{ type: "spring", bounce: 0.25, duration: 0.6 }}
                >
                  {/* Glossy shine effect */}
                  <div className="absolute inset-x-2 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/80 to-transparent opacity-70" />
                  <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent opacity-50 rounded-full" />
                </motion.div>
              )}
              <span className="relative z-10 transition-all duration-300">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
