'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth';
import dayjs from 'dayjs';
import { Crown, ShieldCheck, Calendar, Receipt } from 'lucide-react';
import Empty from '@/components/common/Empty';

interface UserProfileData {
  id: string;
  userName: string;
  avatar: string;
  phone?: string;
  isPro: boolean;
  memberPlan: string;
  membershipExpiresAt: string | null;
  createdAt: string;
}

interface MemberOrder {
  id: string;
  outTradeNo: string;
  plan: string;
  amount: number;
  transactionId: string | null;
  periodStart: string;
  periodEnd: string;
}

const planNames: Record<string, string> = {
  trial: '试用会员',
  test: '测试会员',
  monthly: '月付高级版',
  quarterly: '季付高级版',
  yearly: '年付高级版',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function getPeriodStatus(start: string, end: string) {
  const now = Date.now();
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  if (now >= s && now < e) return { label: '使用中', cls: 'text-green-600 bg-green-50 border-green-200' };
  if (now < s) return { label: '待使用', cls: 'text-yellow-600 bg-yellow-50 border-yellow-200' };
  return { label: '已过期', cls: 'text-red-500 bg-red-50 border-red-200' };
}

function UserProfileComponent() {
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [orders, setOrders] = useState<MemberOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editedUserName, setEditedUserName] = useState('');
  const [editedAvatar, setEditedAvatar] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const setUserInfo = useAuthStore(state => state.setUserInfo);

  useEffect(() => {
    Promise.all([
      fetch('/api/user').then(r => r.json()),
      fetch('/api/user/orders').then(r => r.json()),
    ]).then(([userData, orderData]) => {
      setProfile(userData);
      setEditedUserName(userData.userName);
      setEditedAvatar(userData.avatar);
      setOrders(orderData);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!editedUserName) { toast.error('请输入用户名'); return; }
    try {
      setUploading(true);
      let avatarUrl = editedAvatar;
      if (avatarFile) {
        const formData = new FormData();
        formData.append('avatar', avatarFile);
        const uploadRes = await fetch('/api/user/avatar', { method: 'POST', body: formData });
        if (!uploadRes.ok) { toast.error('头像上传失败'); return; }
        avatarUrl = (await uploadRes.json()).url;
      }
      const res = await fetch('/api/user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userName: editedUserName, avatar: avatarUrl }),
      });
      if (res.ok) {
        const updated = await res.json();
        setProfile(p => p ? { ...p, ...updated } : p);
        setEditing(false);
        setAvatarFile(null);
        setUserInfo({
          userName: updated.userName,
          avatar: updated.avatar,
          isAdmin: updated.isAdmin,
          isPro: profile?.isPro ?? false,
          memberPlan: profile?.memberPlan ?? 'free',
          membershipExpiresAt: profile?.membershipExpiresAt ?? null,
        });
        toast.success('个人信息更新成功');
      }
    } catch { toast.error('更新失败，请重试'); }
    finally { setUploading(false); }
  };

  if (loading) return <div className="flex justify-center items-center py-20 text-slate-400">加载中...</div>;
  if (!profile) return <div className="flex justify-center items-center py-20 text-slate-400">获取用户信息失败</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6 mt-12 md:mt-0">
      {/* 用户基本信息卡片 */}
      <div className="border rounded-2xl p-3 md:p-6">
        <div className="flex items-center gap-5">
          <div className="relative shrink-0">
            {profile.avatar?.trim() ? (
              <Image src={profile.avatar} alt="头像" width={80} height={80} className="rounded-full object-cover h-12 w-12 md:h-20 md:w-20" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center text-3xl">👤</div>
            )}
            {profile.isPro && (
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center">
                <Crown className="w-3.5 h-3.5 text-white" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            {editing ? (
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-slate-500 mb-1 block">用户名</label>
                  <Input value={editedUserName} onChange={e => setEditedUserName(e.target.value)} placeholder="请输入用户名" />
                </div>
                <div>
                  <label className="text-sm text-slate-500 mb-1 block">头像</label>
                  <div className="flex items-center gap-3">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={avatarFile ? URL.createObjectURL(avatarFile) : editedAvatar} />
                      <AvatarFallback>预览</AvatarFallback>
                    </Avatar>
                    <div>
                      <label htmlFor="avatar-upload" className="inline-block px-3 py-1.5 rounded-full text-sm font-medium bg-slate-100 hover:bg-slate-200 cursor-pointer transition-colors">
                        选择文件
                      </label>
                      <input id="avatar-upload" type="file" accept="image/png,image/jpeg,image/jpg" onChange={e => { const f = e.target.files?.[0]; if (f) setAvatarFile(f); }} className="hidden" />
                      <p className="mt-1 text-xs text-slate-400">PNG / JPG，不超过 5MB</p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" onClick={handleSave} disabled={uploading} className="cursor-pointer">{uploading ? '保存中...' : '保存'}</Button>
                  <Button size="sm" variant="outline" onClick={() => { setEditing(false); setAvatarFile(null); }} disabled={uploading} className="cursor-pointer">取消</Button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-2xl font-semibold truncate">{profile.userName || profile.phone}</h3>
                  {profile.isPro ? (
                    profile.memberPlan === 'trial' ? (
                      <span className="flex items-center gap-1 text-orange-500 font-medium">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        试用会员
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-indigo-500 font-medium">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        高级会员
                      </span>
                    )
                  ) : (
                    <span className="flex items-center gap-1 text-slate-400 transition-colors">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      免费会员
                    </span>
                  )}
                  {/* <button onClick={() => setEditing(true)} className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
                    <Pencil className="w-4 h-4" />
                  </button> */}
                </div>
                {profile.id &&
                  <div className='flex items-center gap-1'>
                    <p className="text-base text-slate-400 mt-0.5">用户ID：{profile.id}</p>
                    <div
                      className="min-w-8 text-base cursor-pointer text-indigo-500 hover:text-indigo-600 transition-colors"
                      onClick={() => { navigator.clipboard.writeText(profile.id); toast.success("复制成功"); }}
                    >复制</div>
                  </div>
                }
                {/* {profile.phone && <p className="text-base text-slate-500 mt-0.5">{profile.phone}</p>} */}
                <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                  <span className="flex items-center gap-1 text-base">
                    <Calendar className="w-4 h-4" />
                    加入Listenly的第<span className="text-indigo-500 text-lg">{Math.max(1, dayjs().diff(dayjs(profile.createdAt), 'day') + 1)}</span>天
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 我的订单卡片 */}
      <div className="border rounded-2xl p-3 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-base font-semibold flex items-center gap-2">
            <Receipt className="w-4 h-4 text-slate-500 hidden md:block" />
            我的订单
          </h4>
          <div className="flex items-center gap-3">
            {orders.length > 0 && (() => {
              const expiresAt = orders.reduce((latest, o) => {
                const e = new Date(o.periodEnd).getTime();
                return e > latest ? e : latest;
              }, 0);
              return expiresAt > 0 ? (
                <div className="text-sm text-slate-500 flex flex-col items-end">
                  <span>会员到期时间</span>
                  <span>{dayjs(expiresAt).format('YYYY-MM-DD HH:mm:ss')}</span>
                </div>
              ) : null;
            })()}
            <Link href="/vip">
              <Button size="sm" variant="outline" className="cursor-pointer bg-indigo-100 text-indigo-500 hover:bg-indigo-300">升级会员</Button>
            </Link>
          </div>
        </div>
        {orders.length === 0 ? (
          <div className="text-center py-6">
            <Empty text="暂无订单记录" />
            {/* <Link href="/vip">
              <Button variant="outline" size="sm" className="cursor-pointer">去开通会员</Button>
            </Link> */}
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map(order => {
              const st = getPeriodStatus(order.periodStart, order.periodEnd);
              return (
                <div key={order.id} className="flex items-center justify-between p-4 rounded-xl border border-slate-100 gap-4 relative sm:static">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 hidden sm:flex rounded-full items-center justify-center shrink-0 ${st.label === '使用中' ? 'bg-indigo-50' : st.label === '待使用' ? 'bg-yellow-50' : 'bg-slate-100'}`}>
                      <Crown className={`w-5 h-5 ${st.label === '使用中' ? 'text-indigo-500' : st.label === '待使用' ? 'text-yellow-500' : 'text-slate-400'}`} />
                    </div>
                    <div>
                      <div className="font-medium text-base">
                        {planNames[order.plan] || order.plan}
                        {order.transactionId === 'ADMIN_GIFT' && <span className="ml-1 text-xs text-amber-500">（赠送）</span>}
                      </div>
                      <div className="text-sm text-slate-400 mt-0.5">
                        有效期：{formatDate(order.periodStart)} 至 {formatDate(order.periodEnd)}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                        订单号：{order.outTradeNo}
                        <span
                          className="ml-1 min-w-8 cursor-pointer text-indigo-500 hover:text-indigo-600 transition-colors"
                          onClick={() => { navigator.clipboard.writeText(order.outTradeNo); toast.success("复制成功"); }}
                        >复制</span>
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0 flex flex-row md:flex-col gap-2 md:gap-1 items-center absolute sm:static right-3 top-3">
                    <div className="font-semibold text-xs">{order.plan === 'trial' ? '试用' : order.transactionId === 'ADMIN_GIFT' ? '赠送' : `¥${(order.amount / 100).toFixed(2)}`}</div>
                    <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${st.cls}`}>{st.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default UserProfileComponent;
