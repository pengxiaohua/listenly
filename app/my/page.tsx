'use client';

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { HomeIcon, SpellCheck2Icon, BookTypeIcon } from 'lucide-react'

import AuthGuard from '@/components/auth/AuthGuard'

// 导入拆分后的组件
import HomePage from './components/HomePage'
import StudyTimeLeaderboard from './components/StudyTimeLeaderboard';
import UserProfile from './components/UserProfile';
import SentenceRecords from './components/SentenceRecords'; // eslint-disable-line @typescript-eslint/no-unused-vars
import WordRecords from './components/WordRecords'; // eslint-disable-line @typescript-eslint/no-unused-vars
import NewWords from './components/NewWords';
import WrongWords from './components/WrongWords';
import LearningRecords from './components/LearningRecords';


export default function MyRecords() {
  return (
    <AuthGuard>
      <div className="container mx-auto p-6">
        <Tabs defaultValue="homepage" orientation="vertical" className="flex gap-6 !flex-row">
          <TabsList className="h-58 w-30 flex flex-col bg-transparent">
          <TabsTrigger
              value="homepage"
              className="w-full h-10 justify-start gap-2 p-3 data-[state=active]:bg-primary/5 rounded-lg cursor-pointer"
            >
              <HomeIcon />
              主页
            </TabsTrigger>
            <TabsTrigger
              value="records"
              className="w-full h-10 justify-start gap-2 p-3 data-[state=active]:bg-primary/5 rounded-lg cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
              学习记录
            </TabsTrigger>
            <TabsTrigger
              value="vocabulary"
              className="w-full h-10 justify-start gap-2 p-3 data-[state=active]:bg-primary/5 rounded-lg cursor-pointer"
            >
              <BookTypeIcon />
              生词本
            </TabsTrigger>
            <TabsTrigger
              value="wrong-words"
              className="w-full h-10 justify-start gap-2 p-3 data-[state=active]:bg-primary/5 rounded-lg cursor-pointer"
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
            <TabsTrigger
              value="leaderboard"
              className="w-full h-10 justify-start gap-2 p-3 data-[state=active]:bg-primary/5 rounded-lg cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M7 13l3-3 4 4 5-5"/></svg>
              排行榜
            </TabsTrigger>
          </TabsList>
          <div className="flex-1">
          <TabsContent value="homepage" className="m-0">
              <div className="border rounded-lg p-6">
                <h2 className="text-2xl font-semibold mb-6">主页</h2>
                <HomePage />
              </div>
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
