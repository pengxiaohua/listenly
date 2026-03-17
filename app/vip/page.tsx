"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { WholeWord, NotebookText, Mic, Clapperboard, Speech, Settings } from "lucide-react"

const featureIcons = [WholeWord, NotebookText, Mic, Clapperboard, Speech, Settings];

const plans = [
  {
    key: "free",
    name: "基础版",
    originalPrice: "",
    price: "0",
    period: "/ 永久",
    desc: "体验基础功能，了解产品核心价值",
    color: "bg-pink-200",
    buttonText: "开始使用",
    tag: '',
    features: [
      "学习单词拼写免费课程包",
      "学习句子听写免费课程包",
      "影子跟读每天5个句子共15次练习",
      "视听演练部分免费视频学习",
      "基础默认发音",
      "全局基础配置"
    ],
  },
  {
    key: "monthly",
    name: "月付高级版",
    days: "30",
    originalPrice: "39",
    price: "29",
    period: "/ 月",
    desc: "适合短期学习，灵活订阅，随时可停",
    color: "bg-[#93C5FD]",
    buttonText: "立即订阅",
    tag: '',
    features: [
      "解锁单词拼写全部课程",
      "解锁句子听写全部课程",
      "影子跟读每天20个句子共60次练习",
      "视听演练全部视频无限次学习(开发中)",
      "会员专属发音(4种英音和美音)",
      "全局高级配置（如快捷键修改、提示音切换等）",
    ],
  },
  {
    key: "quarterly",
    name: "季付高级版",
    days: "90",
    originalPrice: "99",
    price: "69",
    period: "/ 季",
    desc: "最受欢迎，新人首选，适合家庭共享",
    color: "bg-[#6EE7B7]",
    buttonText: "立即订阅",
    popular: '最受欢迎',
    features: [
      "解锁单词拼写全部课程",
      "解锁句子听写全部课程",
      "影子跟读每天20个句子共60次练习",
      "视听演练全部视频无限次学习(开发中)",
      "会员专属发音(4种英音和美音)",
      "全局高级配置（如快捷键修改、提示音切换等）",
    ],
  },
  {
    key: "yearly",
    name: "年付高级版",
    days: "365",
    originalPrice: "329",
    price: "199",
    period: "/ 年",
    desc: "性价比之王，长期学习最佳选择",
    color: "bg-[#FDE68A]",
    buttonText: "立即订阅",
    popular: '性价比最高',
    features: [
      "解锁单词拼写全部课程",
      "解锁句子听写全部课程",
      "影子跟读每天40个句子共120次练习",
      "视听演练全部视频无限次学习(开发中)",
      "会员专属发音(4种英音和美音)",
      "全局高级配置（如快捷键修改、提示音切换等）",
    ],
  },
];

export default function PricingPage() {
  const router = useRouter();

  const handleClick = (plan: (typeof plans)[number]) => {
    if (plan.buttonText === "开始使用") {
      router.push("/my");
    }
  };

  return (
    <div className="min-h-screen black:bg-black black:text-white text-black px-4 sm:px-6 mt-10 lg:px-8 flex flex-col items-center">
      <div className="text-center mx-auto space-y-4 mb-12">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
          订阅计划
        </h1>
        <p className="text-xl text-slate-400">
          选择最适合您的会员计划，畅享全部高级功能
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 max-w-7xl w-full">
        {plans.map((plan) => (
          <div
            key={plan.key}
            className={`text-black border border-slate-200 hover:border-indigo-600 shadow-md rounded-3xl py-6 px-4 flex flex-col relative overflow-hidden group hover:scale-105 transition-transform duration-300`}
          >
            {plan.popular && (
              <div className="absolute top-6 right-4 bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                {plan.popular}
              </div>
            )}

            <div className="mb-6">
              <h3 className="text-xl font-medium opacity-80 mb-2 flex items-center gap-2">
                <span>{plan.name}</span>
                {plan.days && (
                  <span className="text-xs font-bold opacity-80 bg-black/10 px-2 py-1 rounded">
                    {plan.days}天
                  </span>
                )}
              </h3>
              <div className="flex items-baseline justify-start gap-2 flex-wrap">
                {plan.originalPrice ? (
                  <span className="text-slate-500 line-through text-2xl font-medium">
                    ¥{plan.originalPrice}
                  </span>
                ) : null}
                <span className="text-5xl font-bold">¥{plan.price}</span>
                <span className="text-lg font-medium opacity-80">
                  {plan.period}
                </span>
              </div>
              <div className="mt-4">
                <span className="text-xs font-bold opacity-80 bg-black/10 px-2 py-1 rounded">
                  {plan.desc}
                </span>
              </div>
            </div>

            <ul className="space-y-3 mb-8 flex-1">
              {plan.features.map((feature, i) => {
                const Icon = featureIcons[i];
                return (
                <li key={i} className="flex justify-start gap-2">
                  <Icon className="w-4 h-4 pt-1" />
                  <span className="text-sm font-medium">{feature}</span>
                </li>
                );
              })}
            </ul>
            <Button
              onClick={() => handleClick(plan)}
              className="w-full bg-indigo-600 text-white group-hover:bg-indigo-600 group-hover:hover:bg-indigo-700 h-12 rounded-full text-base font-bold mt-auto transition-colors cursor-pointer"
            >
              {plan.buttonText}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
