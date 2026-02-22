"use client";

import React from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

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
      "基础发音播放",
      // "体验学习小组",
    ],
  },
  {
    key: "monthly",
    name: "月付高级版",
    originalPrice: "29",
    price: "19",
    period: "/ 月",
    desc: "适合短期学习，灵活订阅，随时可停",
    color: "bg-[#93C5FD]",
    buttonText: "立即订阅",
    tag: '',
    features: [
      "解锁单词拼写全部课程",
      "解锁句子听写全部课程",
      "影子跟读每天20个句子共60次练习",
      "会员专属发音(高级TTS)",
    ],
  },
  {
    key: "quarterly",
    name: "季付高级版",
    originalPrice: "79",
    price: "49",
    period: "/ 季",
    desc: "最受欢迎，新人首选，适合家庭共享",
    color: "bg-[#6EE7B7]",
    buttonText: "立即订阅",
    popular: '最受欢迎',
    features: [
      "解锁单词拼写全部课程",
      "解锁句子听写全部课程",
      "影子跟读每天20个句子共60次练习",
      "会员专属发音(高级TTS)",
      "部分课程PDF文件下载"
    ],
  },
  {
    key: "yearly",
    name: "年付高级版",
    originalPrice: "259",
    price: "159",
    period: "/ 年",
    desc: "性价比之王，长期学习最佳选择",
    color: "bg-[#FDE68A]",
    buttonText: "立即订阅",
    popular: '性价比最高',
    features: [
      "解锁单词拼写全部课程",
      "解锁句子听写全部课程",
      "影子跟读每天40个句子共120次练习",
      "会员专属发音(高级TTS)",
      "部分课程PDF文件下载"
    ],
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen black:bg-black black:text-white text-black px-4 sm:px-6 mt-10 lg:px-8 flex flex-col items-center">
      <div className="text-center mx-auto space-y-4 mb-12">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
          订阅计划
        </h1>
        <p className="text-xl text-gray-400">
          选择最适合您的会员计划，畅享全部高级功能
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 max-w-7xl w-full">
        {plans.map((plan) => (
          <div
            key={plan.key}
            className={`text-black border border-gray-200 hover:border-blue-600 shadow-md rounded-3xl p-8 flex flex-col relative overflow-hidden group hover:scale-105 transition-transform duration-300`}
          >
            {plan.popular && (
              <div className="absolute top-4 right-4 bg-black text-white text-xs font-bold px-3 py-1 rounded-full">
                {plan.popular}
              </div>
            )}

            <div className="mb-6">
              <h3 className="text-base font-medium opacity-80 mb-2">
                {plan.name}
              </h3>
              <div className="flex items-baseline gap-2 flex-wrap">
                {plan.originalPrice ? (
                  <span className="text-gray-500 line-through text-2xl font-medium">
                    ¥{plan.originalPrice}
                  </span>
                ) : null}
                <span className="text-5xl font-bold">¥{plan.price}</span>
                <span className="text-lg font-medium opacity-80">
                  {plan.period}
                </span>
              </div>
              <div className="mt-2">
                <span className="text-xs font-bold opacity-80 bg-black/10 px-2 py-1 rounded">
                  {plan.desc}
                </span>
              </div>
            </div>

            <ul className="space-y-3 mb-8 flex-1">
              {plan.features.map((feature, i) => (
                <li key={i} className="flex items-center gap-3">
                  <div className="rounded-full border border-black/20 p-0.5 shrink-0">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-sm font-medium">{feature}</span>
                </li>
              ))}
            </ul>
            <Button className="w-full bg-black text-white hover:bg-gray-800 group-hover:bg-blue-600 group-hover:hover:bg-blue-700 h-12 rounded-xl text-base font-bold mt-auto transition-colors cursor-pointer">
              {plan.buttonText}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
