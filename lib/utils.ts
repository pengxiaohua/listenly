import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export const cn = (...inputs: ClassValue[]) => {
  return twMerge(clsx(inputs));
}

/**
 * 获取当前 UTC 时间，用于数据库存储
 */
export function getCurrentUTCTime(): Date {
  return new Date();
}

/**
 * 将 UTC 时间转换为东八区时间字符串显示
 */
export function formatTimeForDisplay(utcDate: Date | string): string {
  const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate;
  return date.toLocaleString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

/**
 * 将 UTC 时间转换为东八区时间对象
 */
export function convertUTCToBeijingTime(utcDate: Date | string): Date {
  const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate;
  return new Date(date.getTime() + 8 * 60 * 60 * 1000);
}
