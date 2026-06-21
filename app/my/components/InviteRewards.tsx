'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { QRCodeCanvas } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import {
  Gift,
  Users,
  CalendarClock,
  Copy,
  Link as LinkIcon,
  Ticket,
  ShieldCheck,
  AlertCircle,
  Crown,
  Share2,
  Download,
  RefreshCw,
} from 'lucide-react';

interface Invitee {
  id: string;
  userName: string;
  avatar: string | null;
  joinedAt: string;
}

interface InviteData {
  inviteCode: string;
  invitedCount: number;
  rewardDaysThisMonth: number;
  monthlyCap: number;
  eligibleToInvite: boolean;
  invitees: Invitee[];
}

const RULES: string[] = [
  '邀请资格：仅正式会员（月度 / 季度 / 年度）且在有效期内可发放奖励。资格在被邀请人注册那一刻判定，若此刻你的正式会员已过期，则双方都不发放。',
  '月度封顶：每个自然月最多获得 30 天奖励（10 位好友）；超出后被邀请人仍得 3 天，你不再累加。',
  '仅限全新用户：被邀请人必须是从未注册过的新用户，老用户接受邀请双方都不发放。',
  '即时发放：被邀请人首次登录即给双方各 3 天会员，可与现有会员时长叠加。',
  // '被邀请人不再享有 3 天试用，且不显示顶部试用条；邀请人不受此限制。',
  '临时 / 一次性邮箱无法注册，使用此类邮箱的邀请无效。',
  '邀请码为 6 位字符，每人固定唯一、不可更改。',
  '通过你的专属邀请链接或邀请码邀请好友，奖励自动到账，无需手动领取。',
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

async function copyText(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${label}已复制`);
  } catch {
    toast.error('复制失败，请手动复制');
  }
}

/**
 * 朋友圈海报背景图（本地图片）。
 * 在 public/images/invite/ 放入海报图后，把路径填进来即可随机选用；
 * 留空时使用下方内置的渐变广告海报作为占位。
 * 例如：['/images/invite/poster-1.jpg', '/images/invite/poster-2.jpg']
 */
const POSTER_BACKGROUNDS: string[] = [];

/** 内置渐变海报配色（背景图缺省时的占位广告样式，「换一换」会循环切换） */
const GRADIENT_PALETTES: Array<[string, string, string]> = [
  ['#6366f1', '#8b5cf6', '#d946ef'],
  ['#0ea5e9', '#6366f1', '#7c3aed'],
  ['#f43f5e', '#ec4899', '#8b5cf6'],
  ['#10b981', '#0ea5e9', '#6366f1'],
];

/** 朋友圈文案模板（随机选用，链接会自动追加在末尾） */
const PROMO_TEMPLATES: string[] = [
  '我最近在用 Listenly 练英语听力和口语：单词拼写、句子听写、影子跟读和视频学习都有，体验真的不错。通过我的专属邀请注册，我们俩各得 3 天会员，一起坚持鸭！',
  '想提升英语听力和口语的冲！Listenly 每天听写 + 跟读，进步看得见。扫码或点链接注册，双方各得 3 天会员福利～',
  '英语学习神器 Listenly 安利给大家：雅思托福四六级考研词汇 + 句子听写 + 影子跟读。用我的邀请注册，你和我都能拿 3 天会员！',
  '每天 10 分钟，练听力练口语。我在用的 Listenly 真心好用，扫描海报二维码注册，咱俩各得 3 天会员，名额有限先到先得！',
  '坚持英语打卡中，用的就是 Listenly。功能很全又好上手，通过我的邀请链接注册，双方各得 3 天会员，一起学起来！',
];

const VARIANT_COUNT = Math.max(GRADIENT_PALETTES.length, POSTER_BACKGROUNDS.length || 1);

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** 将图片按 cover 方式铺满画布 */
function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  W: number,
  H: number
) {
  const scale = Math.max(W / img.width, H / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
}

/** 绘制内置渐变广告海报（背景图缺省时的占位） */
function drawGradientAd(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  palette: [string, string, string]
) {
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, palette[0]);
  g.addColorStop(0.5, palette[1]);
  g.addColorStop(1, palette[2]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // 装饰圆
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.beginPath();
  ctx.arc(W * 0.82, 150, 190, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(110, 430, 130, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'alphabetic';
  ctx.font = 'bold 66px sans-serif';
  ctx.fillText('Listenly', 60, 180);
  ctx.font = '32px sans-serif';
  ctx.fillText('英语听力口语训练平台', 62, 232);

  ctx.font = 'bold 58px sans-serif';
  ctx.fillText('每天 10 分钟', 60, 370);
  ctx.fillText('听力口语稳步提升', 60, 444);

  ctx.font = '34px sans-serif';
  const features = [
    '📝  单词拼写 · 海量考纲词库',
    '🎧  句子听写 · 真题听力',
    '🗣️  影子跟读 · 口语纠音',
    '🎬  视听演练 · 视频练听说',
  ];
  features.forEach((f, i) => ctx.fillText(f, 60, 560 + i * 62));
}

/**
 * 合成朋友圈海报：背景（本地图 / 内置渐变）+ 底部白卡（邀请二维码 + 文案）。
 * 返回 PNG dataURL。
 */
async function composePoster(
  qrCanvas: HTMLCanvasElement | null,
  inviteCode: string,
  variant: number
): Promise<string> {
  const W = 750;
  const H = 1200;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  let drewImage = false;
  if (POSTER_BACKGROUNDS.length > 0) {
    const src = POSTER_BACKGROUNDS[variant % POSTER_BACKGROUNDS.length];
    try {
      const img = await loadImage(src);
      drawCover(ctx, img, W, H);
      drewImage = true;
    } catch {
      // 加载失败回退到渐变
    }
  }
  if (!drewImage) {
    drawGradientAd(ctx, W, H, GRADIENT_PALETTES[variant % GRADIENT_PALETTES.length]);
  }

  // 底部白卡
  const cardX = 50;
  const cardW = W - 100;
  const cardH = 300;
  const cardY = H - cardH - 50;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.18)';
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 10;
  ctx.fillStyle = '#ffffff';
  roundRect(ctx, cardX, cardY, cardW, cardH, 28);
  ctx.fill();
  ctx.restore();

  // 二维码
  const qrSize = 220;
  const qrX = cardX + 30;
  const qrY = cardY + (cardH - qrSize) / 2;
  if (qrCanvas) {
    ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);
  }

  // 右侧文案
  const tx = qrX + qrSize + 40;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 44px sans-serif';
  ctx.fillText('扫码注册', tx, cardY + 95);
  ctx.fillStyle = '#475569';
  ctx.font = '30px sans-serif';
  ctx.fillText('注册即送，双方', tx, cardY + 150);
  ctx.fillStyle = '#7c3aed';
  ctx.font = 'bold 36px sans-serif';
  ctx.fillText('各得 3 天会员', tx, cardY + 200);
  ctx.fillStyle = '#94a3b8';
  ctx.font = '26px sans-serif';
  ctx.fillText(`邀请码 ${inviteCode}`, tx, cardY + 256);

  return canvas.toDataURL('image/png');
}

export default function InviteRewards() {
  const [data, setData] = useState<InviteData | null>(null);
  const [loading, setLoading] = useState(true);

  // 朋友圈海报相关
  const [posterUrl, setPosterUrl] = useState<string | null>(null);
  const [variant, setVariant] = useState(0);
  const [promoIdx, setPromoIdx] = useState(0);
  const [origin, setOrigin] = useState('');
  const qrWrapRef = useRef<HTMLDivElement>(null);

  // 取当前访问站点的根地址，用于拼接邀请链接
  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const inviteUrl = data && origin ? `${origin}/?invite=${data.inviteCode}` : '';

  useEffect(() => {
    fetch('/api/invite/me')
      .then((r) => {
        if (!r.ok) throw new Error('加载失败');
        return r.json();
      })
      .then(setData)
      .catch(() => toast.error('获取邀请信息失败'))
      .finally(() => setLoading(false));
  }, []);

  // 数据加载后随机初始化海报样式与文案
  useEffect(() => {
    if (!data) return;
    setVariant(Math.floor(Math.random() * VARIANT_COUNT));
    setPromoIdx(Math.floor(Math.random() * PROMO_TEMPLATES.length));
  }, [data]);

  // 合成海报（二维码 + 背景）
  useEffect(() => {
    if (!data || !inviteUrl) return;
    let cancelled = false;
    const id = requestAnimationFrame(async () => {
      const qrCanvas =
        (qrWrapRef.current?.querySelector('canvas') as HTMLCanvasElement | null) ?? null;
      const url = await composePoster(qrCanvas, data.inviteCode, variant);
      if (!cancelled && url) setPosterUrl(url);
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(id);
    };
  }, [data, inviteUrl, variant]);

  const promoText = inviteUrl ? `${PROMO_TEMPLATES[promoIdx]}\n👉 ${inviteUrl}` : '';

  const reshuffle = () => {
    setVariant((v) => (v + 1) % VARIANT_COUNT);
    setPromoIdx((p) => (p + 1) % PROMO_TEMPLATES.length);
  };

  const downloadPoster = () => {
    if (!posterUrl) return;
    const a = document.createElement('a');
    a.href = posterUrl;
    a.download = `listenly-invite-${data?.inviteCode || 'poster'}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  if (loading) {
    return <div className="text-center py-12 text-slate-400">加载中...</div>;
  }

  if (!data) {
    return (
      <div className="text-center py-12 text-slate-400">
        暂时无法获取邀请信息，请稍后再试
      </div>
    );
  }

  const cardCls =
    'rounded-xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm';

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Gift className="w-6 h-6 text-fuchsia-500" />
        <h2 className="text-2xl font-semibold">邀请有奖</h2>
      </div>

      {/* 资格状态提示 */}
      {data.eligibleToInvite ? (
        <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-800 p-4 text-sm text-emerald-700 dark:text-emerald-300">
          <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" />
          <span>
            你当前是<b>【有效期内的正式会员】</b>，邀请好友注册即可让双方各得 3 天会员奖励。
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 p-4 text-sm text-amber-700 dark:text-amber-300">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span>
              只有<b>【有效期内的正式会员】</b>邀请好友才能发放奖励。开通正式会员后即可参与邀请有奖。
            </span>
            <Link href="/vip" className="ml-2 inline-block">
              <Button
                size="sm"
                variant="outline"
                className="cursor-pointer bg-indigo-100 text-indigo-600 hover:bg-indigo-200 border-indigo-200"
              >
                <Crown className="w-4 h-4 mr-1" />
                开通会员
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* 统计卡 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className={cardCls}>
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <Users className="w-4 h-4" />
            已邀请好友
          </div>
          <div className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">
            {data.invitedCount}
            <span className="text-base font-normal text-slate-400 ml-1">位</span>
          </div>
        </div>
        <div className={cardCls}>
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <CalendarClock className="w-4 h-4" />
            本月已获奖励
          </div>
          <div className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">
            {data.rewardDaysThisMonth}
            <span className="text-base font-normal text-slate-400 ml-1">
              / {data.monthlyCap} 天
            </span>
          </div>
        </div>
      </div>

      {/* 邀请方式 */}
      <div className={cardCls}>
        <h3 className="font-medium text-lg mb-4">邀请方式</h3>

        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
              <Ticket className="w-4 h-4" />
              我的邀请码
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 font-mono text-lg tracking-[0.3em] text-center py-2.5 rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-700 select-all">
                {data.inviteCode}
              </div>
              <Button
                variant="outline"
                className="h-11 cursor-pointer shrink-0"
                onClick={() => copyText(data.inviteCode, '邀请码')}
              >
                <Copy className="w-4 h-4 mr-1" />
                复制
              </Button>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
              <LinkIcon className="w-4 h-4" />
              我的邀请链接
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 truncate text-sm py-2.5 px-3 rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-700">
                {inviteUrl}
              </div>
              <Button
                variant="outline"
                className="h-11 cursor-pointer shrink-0"
                onClick={() => copyText(inviteUrl, '邀请链接')}
              >
                <Copy className="w-4 h-4 mr-1" />
                复制
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 转发到朋友圈 */}
      <div className={cardCls}>
        <h3 className="font-medium text-lg mb-1 flex items-center gap-2">
          <Share2 className="w-5 h-5 text-fuchsia-500" />
          转发到朋友圈
        </h3>
        <p className="text-sm text-slate-400 mb-4">
          保存下方海报并复制文案，发到微信朋友圈邀请好友（海报已含你的专属邀请二维码）
        </p>

        <div className="flex flex-col sm:flex-row gap-5">
          {/* 海报预览 */}
          <div className="sm:w-1/4">
            {posterUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={posterUrl}
                alt="邀请海报"
                className="w-full rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm"
              />
            ) : (
              <div className="w-full aspect-[3/4] rounded-xl bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center text-slate-400 text-sm">
                海报生成中...
              </div>
            )}
            <p className="xl:hidden text-xs text-slate-400 mt-2 text-center">
              手机端长按图片即可保存
            </p>
          </div>

          {/* 文案 + 操作 */}
          <div className="sm:w-3/4 flex flex-col">
            <div className="flex-1 text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-700 p-3 leading-relaxed min-h-[160px]">
              {promoText}
            </div>
            <div className="flex gap-2 mt-3">
              <Button
                className="flex-1 cursor-pointer"
                onClick={() => copyText(promoText, '朋友圈文案')}
              >
                <Copy className="w-4 h-4 mr-1" />
                复制文案
              </Button>
              <Button
                variant="outline"
                className="cursor-pointer"
                onClick={reshuffle}
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                换一换
              </Button>
              <Button
                variant="outline"
                className="cursor-pointer hidden sm:inline-flex"
                onClick={downloadPoster}
                disabled={!posterUrl}
              >
                <Download className="w-4 h-4 mr-1" />
                保存图片
              </Button>
            </div>
          </div>
        </div>

        {/* 隐藏的二维码画布，用于合成海报 */}
        {inviteUrl && (
          <div ref={qrWrapRef} className="hidden" aria-hidden="true">
            <QRCodeCanvas value={inviteUrl} size={240} level="M" marginSize={2} />
          </div>
        )}
      </div>

      {/* 已邀请好友列表 */}
      <div className={cardCls}>
        <h3 className="font-medium text-lg mb-4">已邀请好友</h3>
        {data.invitees.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm">
            还没有邀请记录，快把链接分享给好友吧
          </div>
        ) : (
          <div className="space-y-3">
            {data.invitees.map((u) => (
              <div
                key={u.id}
                className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 dark:border-slate-700"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={u.avatar || '/icons/apple-touch-icon.png'}
                  alt={u.userName}
                  className="w-10 h-10 rounded-full object-cover bg-slate-100"
                />
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{u.userName}</div>
                  <div className="text-xs text-slate-400">
                    加入于 {formatDate(u.joinedAt)}
                  </div>
                </div>
                <span className="shrink-0 text-xs px-2 py-0.5 rounded-full border font-medium text-pink-600 bg-pink-50 border-pink-200">
                  已发放奖励
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 规则说明 */}
      <div className={cardCls}>
        <h3 className="font-medium text-lg mb-4">活动规则</h3>
        <ol className="space-y-2.5">
          {RULES.map((rule, i) => (
            <li key={i} className="flex gap-2.5 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              <span className="shrink-0 w-5 h-5 rounded-full bg-fuchsia-50 text-fuchsia-600 text-xs flex items-center justify-center font-medium mt-0.5">
                {i + 1}
              </span>
              <span>{rule}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
