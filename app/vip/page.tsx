"use client";

import React, { useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type BillingCycle = "monthly" | "quarterly" | "yearly";

const pricingData = {
  monthly: {
    price: "19",
    period: "/ 月",
    label: "月付",
    desc: "适合短期学习，灵活订阅，随时可停",
  },
  quarterly: {
    price: "49",
    period: "/ 季",
    label: "季付",
    desc: "最受欢迎，新人首选，适合家庭共享",
  },
  yearly: {
    price: "159",
    period: "/ 年",
    label: "年付",
    desc: "性价比之王，长期学习最佳选择",
  },
};

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");

  const features = {
    basic: [
      "访问免费课程包",
      "基础发音播放",
      "体验学习小组",
    ],
    pro: [
      "解锁全部课程内容（专享+共享）",
      "会员专属发音人(高级TTS)",
      "语音输入功能",
      "编辑端自定义课程",
      "每月10000钻石",
    ],
  };

  return (
    <div className="min-h-screen bg-black text-white py-20 px-4 sm:px-6 lg:px-8 flex flex-col items-center">
      <div className="text-center max-w-3xl mx-auto space-y-4 mb-12">
        <h1 className="text-4xl sm:text-6xl font-bold tracking-tight">
          订阅计划
        </h1>
        <p className="text-xl text-gray-400">
          选择最适合您的会员计划，畅享全部特权
        </p>
      </div>

      {/* Billing Cycle Toggle */}
      <div className="bg-gray-900/50 p-1 rounded-xl flex items-center mb-16 border border-gray-800">
        {(Object.keys(pricingData) as BillingCycle[]).map((cycle) => (
          <button
            key={cycle}
            onClick={() => setBillingCycle(cycle)}
            className={cn(
              "px-6 py-2 rounded-lg text-sm font-medium transition-all duration-200 min-w-[80px]",
              billingCycle === cycle
                ? "bg-white text-black shadow-lg"
                : "text-gray-400 hover:text-white hover:bg-gray-800"
            )}
          >
            {pricingData[cycle].label}
          </button>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-8 max-w-5xl w-full">
        {/* Basic Plan */}
        <div className="bg-pink-200 text-black rounded-3xl p-8 flex flex-col relative overflow-hidden group hover:scale-105 transition-transform duration-300">
          <div className="mb-6">
            <h3 className="text-sm font-medium opacity-80 mb-2">基础版</h3>
            <div className="flex items-baseline gap-1">
              <span className="text-6xl font-bold">¥0</span>
              <span className="text-xl font-medium opacity-80">/ 永久</span>
            </div>
            <p className="mt-4 text-sm font-medium opacity-80">
              体验基础功能，了解产品核心价值
            </p>
          </div>

          <ul className="space-y-4 mb-8 flex-1">
            {features.basic.map((feature, i) => (
              <li key={i} className="flex items-center gap-3">
                <div className="rounded-full border border-black/20 p-0.5">
                  <Check className="w-4 h-4" />
                </div>
                <span className="font-medium">{feature}</span>
              </li>
            ))}
          </ul>

          <Button 
            className="w-full bg-black text-white hover:bg-gray-800 h-12 rounded-xl text-base font-bold mt-auto"
          >
            开始使用
          </Button>
        </div>

        {/* Pro Plan */}
        <div className="bg-[#6EE7B7] text-black rounded-3xl p-8 flex flex-col relative overflow-hidden group hover:scale-105 transition-transform duration-300">
          <div className="mb-6">
            <h3 className="text-sm font-medium opacity-80 mb-2">高级版</h3>
            <div className="flex items-baseline gap-1">
              <span className="text-6xl font-bold">¥{pricingData[billingCycle].price}</span>
              <span className="text-xl font-medium opacity-80">{pricingData[billingCycle].period}</span>
            </div>
            <div className="mt-1">
               <span className="text-xs font-bold opacity-80 bg-black/10 px-2 py-1 rounded">{pricingData[billingCycle].desc}</span>
            </div>
            
            <p className="mt-4 text-sm font-medium opacity-80">
              适合追求高效学习的英语爱好者，解锁全部高级功能
            </p>
          </div>

          <ul className="space-y-4 mb-8 flex-1">
            {features.pro.map((feature, i) => (
              <li key={i} className="flex items-center gap-3">
                 <div className="rounded-full border border-black/20 p-0.5">
                  <Check className="w-4 h-4" />
                </div>
                <span className="font-medium">{feature}</span>
              </li>
            ))}
          </ul>

          <Button 
            className="w-full bg-black text-white hover:bg-gray-800 h-12 rounded-xl text-base font-bold mt-auto"
          >
            立即订阅
          </Button>
        </div>
      </div>
    </div>
  );
}

