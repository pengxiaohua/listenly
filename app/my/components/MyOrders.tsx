"use client";

import { useEffect, useState } from "react";
import { Crown } from "lucide-react";
import { toast } from "sonner";

interface Order {
  id: string;
  outTradeNo: string;
  plan: string;
  amount: number;
  status: string;
  transactionId: string | null;
  createdAt: string;
  periodStart: string;
  periodEnd: string;
}

const planNames: Record<string, string> = {
  trial: "试用会员",
  test: "测试会员",
  monthly: "月付高级版",
  quarterly: "季付高级版",
  yearly: "年付高级版",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" });
}

function getPeriodStatus(start: string, end: string) {
  const now = Date.now();
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  if (now >= s && now < e) return { label: "使用中", color: "text-green-600 bg-green-50 border-green-200" };
  if (now < s) return { label: "待使用", color: "text-yellow-600 bg-yellow-50 border-yellow-200" };
  return { label: "已过期", color: "text-red-500 bg-red-50 border-red-200" };
}

export default function MyOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/user/orders")
      .then((res) => res.json())
      .then(setOrders)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-8 text-slate-400">加载中...</div>;
  if (!orders.length) return <div className="text-center py-8 text-slate-400">暂无订单记录</div>;

  return (
    <div className="space-y-3">
      {orders.map((order) => {
        const st = getPeriodStatus(order.periodStart, order.periodEnd);
        return (
          <div key={order.id} className="border rounded-xl p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center shrink-0">
                <Crown className="w-5 h-5 text-indigo-500" />
              </div>
              <div>
                <div className="font-medium">
                  {planNames[order.plan] || order.plan}
                  {order.transactionId === 'ADMIN_GIFT' && <span className="ml-1 text-xs text-amber-500">（赠送）</span>}
                </div>
                <div className="text-xs text-slate-600">
                  有效期：{formatDate(order.periodStart)} 至 {formatDate(order.periodEnd)}
                </div>
                <div className="text-xs text-slate-600 mt-0.5 flex items-center gap-1">
                  订单号：{order.outTradeNo}
                  <div
                    className="rounded-full ml-1 cursor-pointer text-indigo-500 hover:text-indigo-600 transition-colors"
                    onClick={() => { navigator.clipboard.writeText(order.outTradeNo); toast.success("复制成功"); }}
                  >复制</div>
                </div>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="font-semibold">{order.plan === 'trial' ? '试用' : order.transactionId === 'ADMIN_GIFT' ? '赠送' : `¥${(order.amount / 100).toFixed(2)}`}</div>
              <span className={`text-xs px-2 py-0.5 rounded-full border ${st.color}`}>{st.label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
