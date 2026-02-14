"use client";

import { useState, useRef } from "react";
import Image from "next/image";

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
import { Send, Image as ImageIcon, X, Loader2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { LiquidTabs } from "@/components/ui/liquid-tabs";

export function FeedbackDialog({
  isOpen,
  onOpenChange
}: {
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [type, setType] = useState("bug");
  const [loading, setLoading] = useState(false);

  const [imageOssKey, setImageOssKey] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 使用外部状态或内部状态
  const open = isOpen !== undefined ? isOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;

  // 是否允许提交
  const isSubmitDisabled =
    title.trim().length === 0 || content.trim().length === 0 || uploading;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 校验
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('仅支持 JPG/PNG/WEBP 格式图片');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('图片大小不能超过 5MB');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/feedback/upload', {
        method: 'POST',
        headers: {
            'x-user-id': 'temp-check' // The API checks for this header but might rely on middleware.
            // In client component, we don't manually set x-user-id usually as middleware does it?
            // Wait, middleware sets x-user-id on request to backend.
            // Client fetch doesn't need to set it if AuthGuard ensures we are logged in.
            // But verify if `upload` api relies on it. Yes.
            // Middleware should inject it if cookie is present.
        },
        body: formData
      });

      if (res.status === 401) {
          toast.error("请先登录");
          setUploading(false);
          return;
      }

      const data = await res.json();
      if (data.success) {
        setImageOssKey(data.ossKey);
        setImageUrl(data.url);
        toast.success("图片上传成功");
      } else {
        toast.error(data.error || "上传失败");
      }
    } catch (error) {
      console.error(error);
      toast.error("上传出错");
    } finally {
      setUploading(false);
      // 清空 input 允许重复上传同一文件
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeImage = () => {
    setImageOssKey(null);
    setImageUrl(null);
  };

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
      body: JSON.stringify({
        title,
        content,
        type,
        imageUrl: imageOssKey // 传 ossKey 给后端保存
      }),
      headers: { "Content-Type": "application/json" },
    });

    const result = await response.json();
    setLoading(false);

    if (result.success) {
      toast.success("反馈提交成功");
      setTitle("");
      setContent("");
      setType("bug");
      setImageOssKey(null);
      setImageUrl(null);
      setOpen(false);
    } else {
      toast.error(result.message || "提交失败");
    }
  };

  return (
    <Dialog open={open} modal={true} onOpenChange={setOpen}>
      {/* 只在没有外部控制时显示触发按钮 */}
      {isOpen === undefined && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="w-10 h-10 rounded-4xl cursor-pointer bg-[#171717] hover:bg-[#171717] transition-all duration-200 group"
                >
                  {/* <MessageSquareText color="#ffffff" size={24} className="group-hover:animate-bounce" /> */}
                  <span className="text-white text-xs">反馈</span>
                </Button>
              </DialogTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>提个建议</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader className="cursor-pointer">
          <DialogTitle>提交反馈</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="flex justify-center">
            <LiquidTabs
              items={[
                { value: "bug", label: "问题反馈" },
                { value: "feature", label: "功能建议" },
              ]}
              value={type}
              onValueChange={setType}
            />
          </div>

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
            className="resize-none break-words min-h-[120px]"
          />

          {/* 图片上传区域 */}
          <div className="flex items-start gap-4">
             <input
               type="file"
               ref={fileInputRef}
               className="hidden"
               accept="image/png,image/jpeg,image/jpg,image/webp"
               onChange={handleImageUpload}
             />

             {!imageUrl ? (
               <Button
                 type="button"
                 variant="outline"
                 size="sm"
                 className="gap-2"
                 onClick={() => fileInputRef.current?.click()}
                 disabled={uploading}
               >
                 {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                 {uploading ? "上传中..." : "上传图片 (可选)"}
               </Button>
             ) : (
               <div className="relative group">
                 <Image
                   src={imageUrl || ""}
                   alt="Preview"
                   className="h-20 w-auto object-cover rounded-md border"
                   width={100}
                 />
                 <button
                   onClick={removeImage}
                   className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                 >
                   <X className="w-4 h-4" />
                 </button>
               </div>
             )}
          </div>

          <Button
            onClick={handleSubmit}
            disabled={loading || uploading}
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
