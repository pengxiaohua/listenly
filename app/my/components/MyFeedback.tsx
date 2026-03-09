"use client";

import { useEffect, useState, useCallback } from "react";
import dayjs from "dayjs";
import { Loader2, MessageSquare, ChevronDown, ChevronUp } from "lucide-react";
import Image from "next/image";

import { cn } from "@/lib/utils";

interface Feedback {
  id: string;
  title: string;
  content: string;
  type: string;
  imageUrl?: string;
  createdAt: string;
  reply?: string;
  replyAt?: string;
  isRead?: boolean;
}

interface MyFeedbackProps {
  onUnreadCountChange?: (count: number) => void;
}

export default function MyFeedback({ onUnreadCountChange }: MyFeedbackProps = {}) {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchFeedback = useCallback(async () => {
    try {
      // 添加 mine=true 参数，强制只获取当前用户的反馈
      const res = await fetch("/api/feedback?mine=true");
      const data = await res.json();
      if (data.success) {
        setFeedbacks(data.data);
        const count = data.unreadCount || 0;
        // 通知父组件未读数量变化
        onUnreadCountChange?.(count);
      } else {
          console.error(data.message);
      }
    } catch (error) {
      console.error("Failed to fetch feedback", error);
    } finally {
      setLoading(false);
    }
  }, [onUnreadCountChange]);

  useEffect(() => {
    fetchFeedback();
  }, [fetchFeedback]);

  // 标记反馈为已读
  const markAsRead = async (feedbackId: string) => {
    try {
      const res = await fetch("/api/feedback", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: feedbackId })
      });
      const data = await res.json();
      if (data.success) {
        // 更新本地状态
        setFeedbacks(prev => prev.map(f =>
          f.id === feedbackId ? { ...f, isRead: true } : f
        ));
        // 重新获取未读数量（会自动更新未读数量并通知父组件）
        fetchFeedback();
      }
    } catch (error) {
      console.error("标记已读失败:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (feedbacks.length === 0) {
    return (
      <div className="text-center py-10 text-slate-500">
        <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-20" />
        <p>暂无反馈记录</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {feedbacks.map((item) => (
        <div key={item.id} className="border rounded-lg bg-card text-card-foreground shadow-sm overflow-hidden">
          <div
            className="flex items-center gap-3 p-4 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors"
            onClick={() => {
              const newExpandedId = expandedId === item.id ? null : item.id;
              setExpandedId(newExpandedId);
              // 如果展开的是有回复但未读的反馈，标记为已读
              if (newExpandedId === item.id && item.reply && !item.isRead) {
                markAsRead(item.id);
              }
            }}
          >
            <span className={cn(
              "px-2 py-0.5 rounded text-xs shrink-0",
              item.type === 'feature' ? "bg-secondary text-secondary-foreground" : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
            )}>
              {item.type === 'feature' ? '建议' : '问题'}
            </span>

            <span className="flex-1 truncate font-medium text-sm">{item.title}</span>

            <div className="flex items-center gap-2 text-xs text-slate-500 shrink-0">
              {item.reply ? (
                <span className="relative px-2 py-0.5 rounded text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800">
                  已回复
                  {item.reply && !item.isRead && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full"></span>
                  )}
                </span>
              ) : (
                <span className="hidden px-2 py-0.5 bg-slate-50 text-slate-500 border border-slate-200 sm:inline-block">待处理</span>
              )}
              <span className="w-28 text-right">{dayjs(item.createdAt).format("YYYY-MM-DD HH:mm")}</span>
              {expandedId === item.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </div>

          {expandedId === item.id && (
            <div className="px-4 pb-4 pt-0 text-sm border-t dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/30">
               <div className="pt-3 space-y-3">
                   <p className="whitespace-pre-wrap text-slate-700 dark:text-slate-300">{item.content}</p>
                   {item.imageUrl && (
                       <div className="mt-2">
                           <Image src={item.imageUrl} alt="screenshot" width={160} height={90} className="max-w-full sm:max-w-xs rounded border shadow-sm" />
                       </div>
                   )}

                   {item.reply && (
                       <div className="mt-3 bg-indigo-50/50 dark:bg-indigo-900/10 p-3 rounded-lg border border-indigo-100 dark:border-indigo-800">
                            <div className="flex items-center gap-2 mb-2 text-indigo-700 dark:text-indigo-400 font-medium">
                                <MessageSquare className="w-4 h-4" />
                                管理员回复
                                <span className="text-xs text-slate-400 font-normal ml-auto">
                                    {dayjs(item.replyAt).format("YYYY-MM-DD HH:mm")}
                                </span>
                            </div>
                            <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{item.reply}</p>
                       </div>
                   )}
               </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
