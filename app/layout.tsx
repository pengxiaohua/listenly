import type { Metadata } from "next";
import {Toaster} from 'sonner'
import { Geist, Geist_Mono } from "next/font/google";
import Header from "@/components/common/Header";
import { FeedbackDialog } from "@/components/common/FeedbackDialog";
import AuthProvider from '@/components/auth/AuthProvider'

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Listen Daily,Up Greatly",
  description: "Listen Daily,Up Greatly",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* Toaster需要再root app下引入，才能全局使用 */}
        <Toaster position="top-center" />
        <Header />
        {children}
        <div className="relative max-w-4xl mx-auto">
          {/* 右下角反馈按钮 */}
          <div className="fixed bottom-6 right-6">
            {/* TODO：userId测试环境用hua，上线用当前用户id */}
            <FeedbackDialog userId="hua" />
          </div>
        </div>
        <AuthProvider />
      </body>
    </html>
  );
}
