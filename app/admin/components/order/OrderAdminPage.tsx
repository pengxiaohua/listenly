'use client'

import { useEffect, useState, useCallback } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { CustomPagination } from '@/components/ui/pagination'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Receipt, Gift } from 'lucide-react'
import dayjs from 'dayjs'

interface Order {
  id: string
  outTradeNo: string
  plan: string
  amount: number
  status: string
  transactionId: string | null
  createdAt: string
  userId: string
  userName: string
  avatar: string
}

interface SearchUser {
  id: string
  userName: string
  avatar: string
  phone?: string
}

const planLabel: Record<string, string> = {
  trial: '试用',
  monthly: '月度',
  quarterly: '季度',
  yearly: '年度',
  test: '测试',
}

const planDays: Record<string, number> = {
  trial: 3,
  test: 1,
  monthly: 30,
  quarterly: 90,
  yearly: 365,
}

export default function OrderAdminPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const pageSize = 20

  // 赠送会员相关状态
  const [giftOpen, setGiftOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUser, setSelectedUser] = useState<SearchUser | null>(null)
  const [giftPlan, setGiftPlan] = useState('monthly')
  const [gifting, setGifting] = useState(false)

  const loadOrders = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/orders?page=${page}&pageSize=${pageSize}`)
      const data = await res.json()
      if (data.orders) {
        setOrders(data.orders)
        setTotal(data.total)
      } else {
        toast.error('加载订单列表失败')
      }
    } catch (error) {
      console.error('加载订单列表失败:', error)
      toast.error('加载订单列表失败')
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    loadOrders()
  }, [loadOrders])

  const handleGift = async () => {
    if (!selectedUser) {
      toast.error('请选择用户')
      return
    }
    setGifting(true)
    try {
      const res = await fetch('/api/admin/orders/gift', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUser.id, plan: giftPlan }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(`已为 ${selectedUser.userName} 赠送${planLabel[giftPlan]}会员`)
        setGiftOpen(false)
        setSelectedUser(null)
        setSearchQuery('')
        loadOrders()
      } else {
        toast.error(data.error || '赠送失败')
      }
    } catch {
      toast.error('赠送失败')
    } finally {
      setGifting(false)
    }
  }

  const formatDate = (dateString: string) => dayjs(dateString).format('YYYY/MM/DD HH:mm')

  const getValidityPeriod = (createdAt: string, plan: string) => {
    const start = dayjs(createdAt)
    const days = planDays[plan] || 30
    const end = start.add(days, 'day')
    return `${start.format('YYYY/MM/DD')} 至 ${end.format('YYYY/MM/DD')}`
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">订单管理</h2>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-600 dark:text-slate-400">
            共 {total} 笔已完成订单
          </span>
          <Button onClick={() => setGiftOpen(true)} className="cursor-pointer">
            <Gift className="w-4 h-4 mr-2" />
            赠送会员
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">加载中...</div>
      ) : orders.length === 0 ? (
        <div className="bg-slate-100 dark:bg-slate-800 p-8 rounded-lg text-center">
          <Receipt className="w-16 h-16 mx-auto mb-4 text-slate-400" />
          <p className="text-slate-600 dark:text-slate-400">暂无已完成订单</p>
        </div>
      ) : (
        <>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>用户</TableHead>
                  <TableHead>订单号</TableHead>
                  <TableHead>会员计划</TableHead>
                  <TableHead>付款金额</TableHead>
                  <TableHead>创建时间</TableHead>
                  <TableHead>订单有效期</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map(order => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={order.avatar} alt={order.userName} className="w-full h-full object-cover" />
                        </Avatar>
                        <div>
                          <div className="font-medium">{order.userName}</div>
                          <p className="text-xs text-slate-500 font-mono">{order.userId.substring(0, 8)}...</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm font-mono">{order.outTradeNo}</TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                        order.plan === 'trial'
                          ? 'text-orange-600 bg-orange-50 border-orange-200'
                          : order.transactionId === 'ADMIN_GIFT'
                          ? 'text-amber-600 bg-amber-50 border-amber-200'
                          : 'text-indigo-600 bg-indigo-50 border-indigo-200'
                      }`}>
                        {planLabel[order.plan] || order.plan}
                        {order.plan === 'trial' && ' (试用)'}
                        {order.transactionId === 'ADMIN_GIFT' && ' (赠送)'}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">
                      {order.plan === 'trial' ? <span className="text-orange-500">试用</span> : order.transactionId === 'ADMIN_GIFT' ? <span className="text-amber-500">赠送</span> : `¥${(order.amount / 100).toFixed(2)}`}
                    </TableCell>
                    <TableCell className="text-sm">{formatDate(order.createdAt)}</TableCell>
                    <TableCell className="text-sm">{getValidityPeriod(order.createdAt, order.plan)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {total > pageSize && (
            <div className="mt-4 flex justify-center">
              <CustomPagination
                currentPage={page}
                totalPages={Math.ceil(total / pageSize)}
                onPageChange={setPage}
              />
            </div>
          )}
        </>
      )}

      {/* 赠送会员弹窗 */}
      <Dialog open={giftOpen} onOpenChange={setGiftOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>赠送会员</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">用户ID</label>
              <Input
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value)
                  setSelectedUser(null)
                }}
                placeholder="输入完整的用户ID"
              />
              {!selectedUser && searchQuery.trim().length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2 cursor-pointer"
                  onClick={async () => {
                    try {
                      const res = await fetch(`/api/admin/user/search?id=${encodeURIComponent(searchQuery.trim())}`)
                      const data = await res.json()
                      if (data.user) {
                        setSelectedUser(data.user)
                      } else {
                        toast.error('未找到该用户')
                      }
                    } catch {
                      toast.error('查询失败')
                    }
                  }}
                >
                  查询用户
                </Button>
              )}
              {selectedUser && (
                <div className="mt-2 flex items-center gap-3 p-2 bg-indigo-50 dark:bg-indigo-950/30 rounded-lg border border-indigo-200">
                  <Avatar className="w-8 h-8">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={selectedUser.avatar} alt={selectedUser.userName} className="w-full h-full object-cover" />
                  </Avatar>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{selectedUser.userName}</div>
                    <div className="text-xs text-slate-500 font-mono">{selectedUser.id.substring(0, 8)}...</div>
                  </div>
                  <button
                    type="button"
                    className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                    onClick={() => { setSelectedUser(null); setSearchQuery(''); }}
                  >
                    更换
                  </button>
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">赠送时长</label>
              <Select value={giftPlan} onValueChange={setGiftPlan}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">月度（30天）</SelectItem>
                  <SelectItem value="quarterly">季度（90天）</SelectItem>
                  <SelectItem value="yearly">年度（365天）</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setGiftOpen(false)} className="cursor-pointer">取消</Button>
              <Button onClick={handleGift} disabled={!selectedUser || gifting} className="cursor-pointer">
                {gifting ? '赠送中...' : '确认赠送'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
