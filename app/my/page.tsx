"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HomeIcon, SpellCheck2Icon, BookTypeIcon, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

import AuthGuard from "@/components/auth/AuthGuard";

// 导入拆分后的组件
import HomePage from "./components/HomePage";
import StudyTimeLeaderboard from "./components/StudyTimeLeaderboard";
import UserProfile from "./components/UserProfile";
import SentenceRecords from "./components/SentenceRecords"; // eslint-disable-line @typescript-eslint/no-unused-vars
import WordRecords from "./components/WordRecords"; // eslint-disable-line @typescript-eslint/no-unused-vars
import NewWords from "./components/NewWords";
import WrongWords from "./components/WrongWords";
import LearningRecords from "./components/LearningRecords";

export default function MyRecords() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("homepage");
  const searchParams = useSearchParams();
  const router = useRouter();

  // 从 URL 参数获取当前 tab
  useEffect(() => {
    const validTabs = ["homepage", "leaderboard", "records", "vocabulary", "wrong-words", "profile"];
    const tab = searchParams.get("tab");
    if (tab && validTabs.includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // 处理 tab 切换
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setIsMenuOpen(false);

    // 更新 URL 参数
    const params = new URLSearchParams(searchParams.toString());
    if (value === "homepage") {
      params.delete("tab"); // 默认 tab 不显示在 URL 中
    } else {
      params.set("tab", value);
    }

    const newUrl = params.toString() ? `?${params.toString()}` : "";
    router.replace(`/my${newUrl}`, { scroll: false });
  };

  return (
    <AuthGuard>
      <div className="container mx-auto p-4 md:p-6">
        {/* 移动端菜单按钮 */}
        <div className="flex items-center justify-between mb-4 md:hidden">
          <h1 className="text-xl font-semibold">学习中心</h1>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </Button>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          orientation="vertical"
          className="flex flex-col md:flex-row gap-6"
        >
          <TabsList className={`w-full flex-row overflow-x-auto md:w-30 md:h-58 md:flex-col flex bg-transparent ${!isMenuOpen ? 'hidden md:flex' : ''}`}>
            <TabsTrigger
              value="homepage"
              className="flex-shrink-0 md:w-full h-10 justify-start gap-2 p-3 data-[state=active]:bg-primary/5 rounded-lg cursor-pointer"
            >
              <HomeIcon />
              主页
            </TabsTrigger>
            <TabsTrigger
              value="leaderboard"
              className="flex-shrink-0 md:w-full h-10 justify-start gap-2 p-3 data-[state=active]:bg-primary/5 rounded-lg cursor-pointer"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 3v18h18" />
                <path d="M7 13l3-3 4 4 5-5" />
              </svg>
              排行榜
            </TabsTrigger>
            <TabsTrigger
              value="records"
              className="flex-shrink-0 md:w-full h-10 justify-start gap-2 p-3 data-[state=active]:bg-primary/5 rounded-lg cursor-pointer"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
              </svg>
              学习记录
            </TabsTrigger>
            <TabsTrigger
              value="vocabulary"
              className="flex-shrink-0 md:w-full h-10 justify-start gap-2 p-3 data-[state=active]:bg-primary/5 rounded-lg cursor-pointer"
            >
              <BookTypeIcon />
              生词本
            </TabsTrigger>
            <TabsTrigger
              value="wrong-words"
              className="flex-shrink-0 md:w-full h-10 justify-start gap-2 p-3 data-[state=active]:bg-primary/5 rounded-lg cursor-pointer"
            >
              <SpellCheck2Icon />
              错词本
            </TabsTrigger>
            <TabsTrigger
              value="profile"
              className="w-full h-10 justify-start gap-2 p-3 data-[state=active]:bg-primary/5 rounded-lg cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 1 0-16 0"/></svg>
              个人信息
            </TabsTrigger>
          </TabsList>
          <div className="flex-1">
            <TabsContent value="homepage" className="m-0">
              <HomePage />
            </TabsContent>
            <TabsContent value="records" className="m-0">
              <div className="border rounded-lg p-6">
                <h2 className="text-2xl font-semibold mb-6">学习记录</h2>
                <LearningRecords />
              </div>
            </TabsContent>
            <TabsContent value="vocabulary" className="m-0">
              <div className="border rounded-lg p-6">
                <h2 className="text-2xl font-semibold mb-6">生词本</h2>
                <NewWords />
              </div>
            </TabsContent>
            <TabsContent value="wrong-words" className="m-0">
              <div className="border rounded-lg p-6">
                <h2 className="text-2xl font-semibold mb-6">错词本</h2>
                <WrongWords />
              </div>
            </TabsContent>
            <TabsContent value="profile" className="m-0">
              <div className="border rounded-lg p-6">
                <h2 className="text-2xl font-semibold mb-6">个人信息</h2>
                <UserProfile />
              </div>
            </TabsContent>
            <TabsContent value="leaderboard" className="m-0">
              <div className="border rounded-lg p-6">
                <h2 className="text-2xl font-semibold mb-6">学习时长排行榜</h2>
                <StudyTimeLeaderboard />
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </AuthGuard>
  );
}
