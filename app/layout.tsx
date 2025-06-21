'use client'

import { Toaster } from 'sonner'
import { Geist, Geist_Mono } from "next/font/google";
import Header from "@/components/common/Header";
import { FeedbackDialog } from "@/components/common/FeedbackDialog";
import AuthProvider from '@/components/auth/AuthProvider'
import AuthGuard from '@/components/auth/AuthGuard'
// import Footer from '@/components/common/Footer'
import { ThemeProvider } from "@/components/common/ThemeProvider";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
      >
        <ThemeProvider>
          {/* Toaster需要再root app下引入，才能全局使用 */}
          <Toaster position="top-center" />
          <Header />
          <main className="flex-grow">
            <AuthGuard>
              {children}
            </AuthGuard>
          </main>
          {/* <Footer /> */}
          <div className="relative max-w-4xl mx-auto">
            {/* 右下角反馈按钮 */}
            <div className="fixed bottom-6 right-6">
              <FeedbackDialog />
            </div>
          </div>
          <AuthProvider />
        </ThemeProvider>
      </body>
    </html>
  );
}
