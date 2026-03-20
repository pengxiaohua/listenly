'use client'

import { useEffect, useState, useCallback } from 'react'
import dayjs from 'dayjs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { CustomPagination } from '@/components/ui/pagination'
import { LiquidTabs } from '@/components/ui/liquid-tabs'
import { Avatar } from '@/components/ui/avatar'
import DataAnalytics from '../analytics/DataAnalytics'

const planNames: Record<string, string> = {
  test: '测试支付', monthly: '月付高级版', quarterly: '季付高级版', yearly: '年付高级版',
}
const statusMap: Record<string, { label: string; cls: string }> = {
  paid:    { label: '已支付', cls: 'text-green-600 bg-green-50 border-green-200' },
  pending: { label: '待支付', cls: 'text-yellow-600 bg-yellow-50 border-yellow-200' },
  failed:  { label: '失败',   cls: 'text-red-500 bg-red-50 border-red-200' },
  closed:  { label: '已关闭', cls: 'text-slate-500 bg-slate-50 border-slate-200' },
}

const TABS = [
  { value: 'assessment', label: '词汇量测评' },
  { value: 'checkin', label: '用户打卡' },
  { value: 'analytics', label: '数据分析' },
  { value: 'orders', label: '订单列表' },
]

interface AssessmentRecord {
  id: string
  userId: string
  userName: string
  finalVocab: number
  cefrLevel: string
  mode: string
  createdAt: string
}

interface CheckInRecord {
  id: number
  userId: string
  userName: string
  minutes: number
  createdAt: string
}

function AssessmentTable() {
  const [records, setRecords] = useState<AssessmentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const pageSize = 20

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/vocab-assessment?page=${page}&pageSize=${pageSize}`)
      const data = await res.json()
      if (data.records) {
        setRecords(data.records)
        setTotal(data.total)
      }
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => { load() }, [load])

  return (
    <>
      <div className="flex justify-end mb-3 text-sm text-slate-500 dark:text-slate-400">共 {total} 条记录</div>
      {loading ? (
        <div className="text-center py-8">加载中...</div>
      ) : (
        <>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>用户名</TableHead>
                  <TableHead>用户ID</TableHead>
                  <TableHead>测试类型</TableHead>
                  <TableHead>测试成绩</TableHead>
                  <TableHead>测试时间</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.userName}</TableCell>
                    <TableCell className="text-sm text-slate-500 font-mono">{r.userId.substring(0, 8)}...</TableCell>
                    <TableCell>{r.mode === 'listening' ? '听力' : '阅读'}</TableCell>
                    <TableCell>{r.finalVocab.toLocaleString()}({r.cefrLevel})</TableCell>
                    <TableCell className="text-sm">{dayjs(r.createdAt).format('YYYY-MM-DD HH:mm')}</TableCell>
                  </TableRow>
                ))}
                {records.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-slate-400">暂无数据</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {total > pageSize && (
            <div className="mt-4 flex justify-center">
              <CustomPagination currentPage={page} totalPages={Math.ceil(total / pageSize)} onPageChange={setPage} />
            </div>
          )}
        </>
      )}
    </>
  )
}

function CheckInTable() {
  const [records, setRecords] = useState<CheckInRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const pageSize = 20

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/checkin?page=${page}&pageSize=${pageSize}`)
      const data = await res.json()
      if (data.records) {
        setRecords(data.records)
        setTotal(data.total)
      }
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => { load() }, [load])

  return (
    <>
      <div className="flex justify-end mb-3 text-sm text-slate-500 dark:text-slate-400">共 {total} 条记录</div>
      {loading ? (
        <div className="text-center py-8">加载中...</div>
      ) : (
        <>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>用户名</TableHead>
                  <TableHead>用户ID</TableHead>
                  <TableHead>打卡时间</TableHead>
                  <TableHead>学习时长</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.userName}</TableCell>
                    <TableCell className="text-sm text-slate-500 font-mono">{r.userId.substring(0, 8)}...</TableCell>
                    <TableCell className="text-sm">{dayjs(r.createdAt).format('YYYY-MM-DD HH:mm')}</TableCell>
                    <TableCell>{r.minutes} 分钟</TableCell>
                  </TableRow>
                ))}
                {records.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-slate-400">暂无数据</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {total > pageSize && (
            <div className="mt-4 flex justify-center">
              <CustomPagination currentPage={page} totalPages={Math.ceil(total / pageSize)} onPageChange={setPage} />
            </div>
          )}
        </>
      )}
    </>
  )
}

interface OrderRecord {
  id: string
  outTradeNo: string
  plan: string
  amount: number
  status: string
  transactionId: string | null
  createdAt: string
  updatedAt: string
  userId: string
  userName: string
  avatar: string
}

function OrderTable() {
  const [records, setRecords] = useState<OrderRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const pageSize = 20

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/orders?page=${page}&pageSize=${pageSize}`)
      const data = await res.json()
      if (data.orders) {
        setRecords(data.orders)
        setTotal(data.total)
      }
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => { load() }, [load])

  return (
    <>
      <div className="flex justify-end mb-3 text-sm text-slate-500 dark:text-slate-400">共 {total} 条记录</div>
      {loading ? (
        <div className="text-center py-8">加载中...</div>
      ) : (
        <>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>用户</TableHead>
                  <TableHead>订单号</TableHead>
                  <TableHead>套餐</TableHead>
                  <TableHead>金额</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>微信交易号</TableHead>
                  <TableHead>创建时间</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map(r => {
                  const st = statusMap[r.status] || statusMap.pending
                  return (
                    <TableRow key={r.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="w-8 h-8">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={r.avatar} alt={r.userName} className="w-full h-full object-cover" />
                          </Avatar>
                          <div>
                            <div className="font-medium text-sm">{r.userName}</div>
                            <div className="text-xs text-slate-400 font-mono">{r.userId.substring(0, 8)}...</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs font-mono text-slate-500">{r.outTradeNo}</TableCell>
                      <TableCell className="text-sm">{planNames[r.plan] || r.plan}</TableCell>
                      <TableCell className="text-sm font-medium">¥{(r.amount / 100).toFixed(2)}</TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${st.cls}`}>{st.label}</span>
                      </TableCell>
                      <TableCell className="text-xs font-mono text-slate-400">{r.transactionId || '-'}</TableCell>
                      <TableCell className="text-sm">{dayjs(r.createdAt).format('YYYY-MM-DD HH:mm')}</TableCell>
                    </TableRow>
                  )
                })}
                {records.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-slate-400">暂无订单</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {total > pageSize && (
            <div className="mt-4 flex justify-center">
              <CustomPagination currentPage={page} totalPages={Math.ceil(total / pageSize)} onPageChange={setPage} />
            </div>
          )}
        </>
      )}
    </>
  )
}

export default function UserActions() {
  const [tab, setTab] = useState('assessment')

  return (
    <div className="p-3">
      <LiquidTabs items={TABS} value={tab} onValueChange={setTab} id="user-actions" className="mb-6" />
      {tab === 'assessment' && <AssessmentTable />}
      {tab === 'checkin' && <CheckInTable />}
      {tab === 'analytics' && <DataAnalytics />}
      {tab === 'orders' && <OrderTable />}
    </div>
  )
}
