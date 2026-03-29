"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HomeIcon, SpellCheck2Icon, BookTypeIcon, Menu, MessageSquare, GraduationCap, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";

import AuthGuard from "@/components/auth/AuthGuard";

// 导入拆分后的组件
import HomePage from "./components/HomePage";
import StudyRank from "./components/StudyRank";
import UserProfile from "./components/UserProfile";
import SentenceRecords from "./components/SentenceRecords"; // eslint-disable-line @typescript-eslint/no-unused-vars
import WordRecords from "./components/WordRecords"; // eslint-disable-line @typescript-eslint/no-unused-vars
import NewWords from "./components/NewWords";
import WrongWords from "./components/WrongWords";
import MyFeedback from "./components/MyFeedback";
import VocabAssessmentLanding from "./components/VocabAssessmentLanding";
// import LearningRecords from "./components/LearningRecords";

const triggerClassName = "flex-shrink-0 text-base w-full h-11 justify-start gap-2.5 px-3 py-2.5 rounded-lg cursor-pointer transition-colors data-[state=active]:bg-indigo-50 dark:data-[state=active]:bg-indigo-900/30 data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400 data-[state=active]:font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50";

export default function MyRecords() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("homepage");
  const [feedbackUnreadCount, setFeedbackUnreadCount] = useState(0);
  const searchParams = useSearchParams();
  const router = useRouter();

  // 从 URL 参数获取当前 tab
  useEffect(() => {
    const validTabs = ["homepage", "rank", "records", "strange", "wrong", "assessment", "profile", "feedback"];
    const tab = searchParams.get("tab");
    if (tab && validTabs.includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // 页面初始化时获取反馈未读数量
  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const res = await fetch("/api/feedback/unread-count");
        const data = await res.json();
        if (data.success && data.unreadCount !== undefined) {
          setFeedbackUnreadCount(data.unreadCount);
        }
      } catch (error) {
        console.error("获取未读数量失败:", error);
      }
    };
    fetchUnreadCount();
  }, []);

  // 抽屉打开时禁止 body 滚动
  useEffect(() => {
    if (isDrawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isDrawerOpen]);

  // 处理 tab 切换
  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value);
    setIsDrawerOpen(false);

    const params = new URLSearchParams(searchParams.toString());
    if (value === "homepage") {
      params.delete("tab");
    } else {
      params.set("tab", value);
    }

    const newUrl = params.toString() ? `?${params.toString()}` : "";
    router.replace(`/my${newUrl}`, { scroll: false });
  }, [searchParams, router]);

  // Tab 菜单项（复用于桌面侧栏和移动端抽屉）
  const tabTriggers = (
    <>
      <TabsTrigger value="homepage" className={triggerClassName}>
        <HomeIcon className="w-4 h-4" />
        主页
      </TabsTrigger>
      <TabsTrigger value="rank" className={triggerClassName}>
        <Trophy className="w-4 h-4" />
        排行榜
      </TabsTrigger>
      <TabsTrigger value="strange" className={triggerClassName}>
        <BookTypeIcon className="w-4 h-4" />
        生词本
      </TabsTrigger>
      <TabsTrigger value="wrong" className={triggerClassName}>
        <SpellCheck2Icon className="w-4 h-4" />
        错词本
      </TabsTrigger>
      <TabsTrigger value="assessment" className={`relative ${triggerClassName}`}>
        <GraduationCap className="w-4 h-4" />
        词汇量
        <span className="absolute top-0 -right-1 md:-right-3 bg-rose-500 rounded-sm py-0.5 px-1 text-[10px] text-white">NEW</span>
      </TabsTrigger>
      <TabsTrigger value="feedback" className={`relative ${triggerClassName}`}>
        <MessageSquare className="w-4 h-4" />
        我的反馈
        {feedbackUnreadCount > 0 && (
          <span className="absolute top-2 right-3 w-2 h-2 bg-rose-500 rounded-full"></span>
        )}
      </TabsTrigger>
      <TabsTrigger value="profile" className={triggerClassName}>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><circle cx="12" cy="8" r="5" /><path d="M20 21a8 8 0 1 0-16 0" /></svg>
        个人信息
      </TabsTrigger>
    </>
  );

  return (
    <AuthGuard>
      <div className="container relative mx-auto p-4 md:px-0 md:pb-0">
        {/* 移动端顶部栏：标题 + 菜单按钮 */}
        <div className="absolute right-4 top-4 z-2 md:hidden">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsDrawerOpen(true)}
          >
            <Menu className="w-4 h-4" />
          </Button>
        </div>

        {/* 移动端侧边抽屉 */}
        <div className="md:hidden">
          {/* 遮罩层 */}
          <div
            className={`fixed inset-0 bg-black/40 z-[60] transition-opacity duration-300 ${isDrawerOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            onClick={() => setIsDrawerOpen(false)}
          />
          {/* 抽屉面板 */}
          <div
            className={`fixed inset-y-0 left-0 w-56 bg-white dark:bg-slate-800 shadow-2xl z-[70] flex flex-col transition-transform duration-300 ease-in-out ${isDrawerOpen ? 'translate-x-0' : '-translate-x-full'}`}
          >
            {/* 占位区域，与 Header 等高 */}
            <div className="flex-shrink-0 h-16 border-b border-slate-100 dark:border-slate-700" />
            {/* 菜单列表 */}
            <div className="flex-1 overflow-y-auto">
              <Tabs value={activeTab} onValueChange={handleTabChange} orientation="vertical">
                <TabsList className="flex flex-col h-auto w-full p-3 gap-1 bg-transparent">
                  {tabTriggers}
                </TabsList>
              </Tabs>
            </div>
          </div>
        </div>

        {/* 主内容区 */}
        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          orientation="vertical"
          className="flex flex-col md:flex-row md:items-start gap-6"
        >
          {/* 桌面端侧栏 */}
          <TabsList className="hidden md:flex border border-slate-100 md:w-36 md:flex-col md:h-fit sticky top-[73px] bg-white dark:bg-slate-800 rounded-xl shadow-lg dark:shadow-slate-900/50 p-3 z-10" style={{ transform: 'translateZ(0)', willChange: 'transform' }}>
            {tabTriggers}
          </TabsList>

          <div className="flex-1 min-w-0" style={{ contain: 'layout' }}>
            <TabsContent value="homepage" className="m-0">
              <HomePage />
            </TabsContent>
            <TabsContent value="strange" className="m-0">
              <h2 className="text-2xl font-semibold mb-4">生词本</h2>
              <NewWords />
            </TabsContent>
            <TabsContent value="wrong" className="m-0">
              <h2 className="text-2xl font-semibold mb-4">错词本</h2>
              <WrongWords />
            </TabsContent>
            <TabsContent value="assessment" className="m-0">
              <VocabAssessmentLanding />
            </TabsContent>
            <TabsContent value="profile" className="m-0">
              <UserProfile />
            </TabsContent>
            <TabsContent value="rank" className="m-0">
              <StudyRank />
            </TabsContent>
            <TabsContent value="feedback" className="m-0">
              <h2 className="text-2xl font-semibold mb-4">我的反馈</h2>
              <MyFeedback onUnreadCountChange={setFeedbackUnreadCount} />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </AuthGuard>
  );
}
