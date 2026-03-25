'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { QRCodeSVG } from 'qrcode.react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, XCircle, MessageCircleQuestion } from 'lucide-react';

interface PayModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: { key: string; name: string; price: string };
  onSuccess: () => void;
}

type PayState = 'loading' | 'ready' | 'paid' | 'error';

export default function PayModal({ open, onOpenChange, plan, onSuccess }: PayModalProps) {
  const [codeUrl, setCodeUrl] = useState('');
  const [payState, setPayState] = useState<PayState>('loading');
  const [error, setError] = useState('');
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [wechatQr, setWechatQr] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);

  const fetchWechatQr = async () => {
    if (wechatQr) return;
    try {
      const res = await fetch('/api/config?key=wechat_group_qr');
      const data = await res.json();
      if (data?.content && data?.type === 'image') {
        setWechatQr(data.content);
      }
    } catch (err) {
      console.error('Failed to fetch WeChat QR:', err);
    }
  };

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const startPolling = useCallback((tradeNo: string) => {
    stopPolling();
    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/pay/status?outTradeNo=${tradeNo}`);
        const data = await res.json();
        if (data.status === 'paid') {
          stopPolling();
          setPayState('paid');
          // 短暂展示成功状态后回调
          setTimeout(() => onSuccess(), 1500);
        }
      } catch {
        // 轮询失败静默忽略，下次重试
      }
    }, 2000);
  }, [stopPolling, onSuccess]);

  useEffect(() => {
    if (!open) {
      stopPolling();
      return;
    }

    // 重置状态
    setPayState('loading');
    setCodeUrl('');
    setError('');

    const createOrder = async () => {
      try {
        const res = await fetch('/api/pay/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plan: plan.key }),
        });
        const data = await res.json();
        if (res.ok) {
          setCodeUrl(data.codeUrl);
          setPayState('ready');
          startPolling(data.outTradeNo);
        } else {
          setError(data.error || '下单失败');
          setPayState('error');
        }
      } catch {
        setError('网络错误，请重试');
        setPayState('error');
      }
    };

    createOrder();

    return () => stopPolling();
  }, [open, plan.key, startPolling, stopPolling]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>微信扫码支付</DialogTitle>
          <DialogDescription>
            {plan.name} - ¥{plan.price}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-4">
          {payState === 'loading' && (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
              <p className="text-sm text-muted-foreground">正在生成支付二维码...</p>
            </div>
          )}

          {payState === 'ready' && codeUrl && (
            <>
              <div className="rounded-lg border p-4 bg-white">
                <QRCodeSVG value={codeUrl} size={200} />
              </div>
              <p className="text-base">
                请使用微信扫描二维码完成支付
              </p>
              <div
                className="relative inline-block"
                onMouseEnter={() => { fetchWechatQr(); setShowQr(true); }}
                onMouseLeave={() => setShowQr(false)}
                onClick={() => { fetchWechatQr(); setShowQr(prev => !prev); }}
              >
                <div className="text-sm text-indigo-500 cursor-pointer hover:underline flex items-center gap-1">
                  <MessageCircleQuestion className="w-4 h-4 text-indigo-500" />
                  遇到支付问题？进群反馈
                </div>
                {showQr && wechatQr && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 z-50">
                    <div className="text-center text-sm mb-1 font-bold text-slate-600 dark:text-slate-300">扫码进群，反馈问题</div>
                    <div className="relative aspect-square w-full bg-white rounded-md overflow-hidden">
                      <Image src={wechatQr} alt="WeChat QR" fill className="object-contain" />
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {payState === 'paid' && (
            <div className="flex flex-col items-center gap-3 py-8">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
              <p className="text-lg font-medium">支付成功</p>
            </div>
          )}

          {payState === 'error' && (
            <div className="flex flex-col items-center gap-3 py-8">
              <XCircle className="h-12 w-12 text-red-500" />
              <p className="text-sm text-red-500">{error}</p>
              <Button
                variant="outline"
                onClick={() => onOpenChange(true)}
              >
                重试
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
