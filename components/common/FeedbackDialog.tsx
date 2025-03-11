"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Send, MessageSquareText } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface FeedbackDialogProps {
  userId: string;
}

export function FeedbackDialog({ userId }: FeedbackDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  // 是否允许提交
  const isSubmitDisabled =
    title.trim().length === 0 || content.trim().length === 0;

  const handleSubmit = async () => {
    if (isSubmitDisabled) {
      return toast.error("标题或内容不能为空");
    }
    if (title.length === 0 || title.length > 20) {
      return toast.error("标题长度应在 1-20 字符之间");
    }
    if (content.length === 0 || content.length > 200) {
      return toast.error("内容长度应在 1-200 字符之间");
    }

    setLoading(true);

    const response = await fetch("/api/feedback", {
      method: "POST",
      body: JSON.stringify({ userId, title, content }),
      headers: { "Content-Type": "application/json" },
    });

    const result = await response.json();
    setLoading(false);

    if (result.success) {
      toast.success("反馈提交成功");
      setTitle("");
      setContent("");
      setIsOpen(false);
    } else {
      toast.error(result.message || "提交失败");
    }
  };

  return (
    <Dialog open={isOpen} modal={true} onOpenChange={setIsOpen}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="w-10 h-10 rounded-4xl cursor-pointer bg-[#171717] hover:bg-[#171717] transition-all duration-200 group"
              >
                <MessageSquareText color="#ffffff" size={24} className="group-hover:animate-bounce" />
              </Button>
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>提个建议</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <DialogContent>
        <DialogHeader className="cursor-pointer">
          <DialogTitle>提交反馈</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            placeholder="标题（最多 20 字符）"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={20}
          />
          <Textarea
            placeholder="请输入您的反馈（最多 200 字符）"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={200}
            className="resize-none break-words"
          />
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full transition cursor-pointer hover:bg-primary/90"
          >
            {loading ? "提交中..." : "提交反馈"}
            <Send className="ml-2 w-4 h-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
