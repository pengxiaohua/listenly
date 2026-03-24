'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { CustomPagination } from '@/components/ui/pagination'
import { Avatar } from '@/components/ui/avatar'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { Trash2, Users, Phone, Smartphone, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'

interface User {
  id: string
  userName: string
  avatar: string
  phone?: string
  wechatOpenId?: string
  deviceOS?: string
  location?: string
  isAdmin?: boolean
  memberPlan: string
  createdAt: string
  lastLogin: string
}

const memberBadge: Record<string, { label: string; cls: string }> = {
  yearly:    { label: '年度会员', cls: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
  quarterly: { label: '季度会员', cls: 'text-blue-600 bg-blue-50 border-blue-200' },
  monthly:   { label: '月度会员', cls: 'text-green-600 bg-green-50 border-green-200' },
  test:      { label: '测试会员', cls: 'text-green-600 bg-green-50 border-green-200' },
  free:      { label: '免费会员', cls: 'text-slate-500 bg-slate-50 border-slate-200' },
}

export default function UserAdminPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [today, setToday] = useState(0)
  const pageSize = 20
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [search, setSearch] = useState('')

  const loadUsers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
      if (search) params.set('search', search)
      const res = await fetch(`/api/user/list?${params}`)
      const data = await res.json()
      if (data.users) {
        setUsers(data.users)
        setTotal(data.pagination.total)
        setToday(data.todayCount || 0)
      } else {
        toast.error('加载用户列表失败')
      }
    } catch (error) {
      console.error('加载用户列表失败:', error)
      toast.error('加载用户列表失败')
    } finally {
      setLoading(false)
    }
  }, [page, search])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  const handleToggleAdmin = async (userId: string, currentIsAdmin: boolean) => {
    try {
      const res = await fetch(`/api/admin/user?id=${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isAdmin: !currentIsAdmin })
      })
      const data = await res.json()
      if (data.success) {
        toast.success('更新成功')
        loadUsers()
      } else {
        toast.error(data.message || '更新失败')
      }
    } catch (error) {
      console.error('更新用户权限失败:', error)
      toast.error('更新失败')
    }
  }

  const handleDelete = async (userId: string, userName: string) => {
    if (!confirm(`确定要删除用户"${userName}"吗？此操作不可恢复。`)) return

    try {
      const res = await fetch(`/api/admin/user?id=${userId}`, {
        method: 'DELETE'
      })
      const data = await res.json()
      if (data.success) {
        toast.success('删除成功')
        loadUsers()
      } else {
        toast.error(data.message || '删除失败')
      }
    } catch (error) {
      console.error('删除用户失败:', error)
      toast.error('删除失败')
    }
  }

  const handleViewDetail = (user: User) => {
    setSelectedUser(user)
    setDialogOpen(true)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getLoginType = (user: User) => {
    if (user.phone && user.wechatOpenId) return '手机 + 微信'
    if (user.phone) return '手机'
    if (user.wechatOpenId) return '微信'
    return '未知'
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">用户管理</h2>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              placeholder="搜索微信名..."
              className="pl-8 w-52"
            />
          </div>
          <div className="text-sm text-slate-600 dark:text-slate-400">
            共 {total} 个用户，今日新用户：{today}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">加载中...</div>
      ) : users.length === 0 ? (
        <div className="bg-slate-100 dark:bg-slate-800 p-8 rounded-lg text-center">
          <Users className="w-16 h-16 mx-auto mb-4 text-slate-400" />
          <p className="text-slate-600 dark:text-slate-400">暂无用户</p>
        </div>
      ) : (
        <>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>用户</TableHead>
                  <TableHead>系统</TableHead>
                  <TableHead>地区</TableHead>
                  <TableHead>登录方式</TableHead>
                  <TableHead>会员状态</TableHead>
                  <TableHead>注册时间</TableHead>
                  <TableHead>最后登录</TableHead>
                  <TableHead>管理员</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map(user => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={user.avatar}
                            alt={user.userName}
                            className="w-full h-full object-cover"
                          />
                        </Avatar>
                        <div>
                          <button
                            onClick={() => handleViewDetail(user)}
                            className="font-medium text-indigo-600 hover:text-indigo-800 hover:underline text-left"
                          >
                            {user.userName}
                          </button>
                          <p className="text-xs text-slate-500 font-mono">
                            {user.id.substring(0, 8)}...
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {user.deviceOS}
                    </TableCell>
                    <TableCell className="text-sm">
                      {user.location || '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-slate-600">
                        {user.phone && <Phone className="w-4 h-4" />}
                        {user.wechatOpenId && <Smartphone className="w-4 h-4" />}
                        <span>{getLoginType(user)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const badge = memberBadge[user.memberPlan] || memberBadge.free
                        return (
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${badge.cls}`}>
                            {badge.label}
                          </span>
                        )
                      })()}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDate(user.createdAt)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDate(user.lastLogin)}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={user.isAdmin || false}
                        onCheckedChange={() => handleToggleAdmin(user.id, user.isAdmin || false)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(user.id, user.userName)}
                        className='cursor-pointer'
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>用户详情</DialogTitle>
            <DialogDescription>查看用户的详细信息</DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="w-20 h-20">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={selectedUser.avatar}
                    alt={selectedUser.userName}
                    className="w-full h-full object-cover"
                  />
                </Avatar>
                <div>
                  <h3 className="text-lg font-semibold">{selectedUser.userName}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 font-mono">
                    ID: {selectedUser.id}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    手机号
                  </label>
                  <p className="mt-1 text-base">
                    {selectedUser.phone || '未绑定'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    微信OpenID
                  </label>
                  <p className="mt-1 text-sm font-mono">
                    {selectedUser.wechatOpenId ?
                      `${selectedUser.wechatOpenId.substring(0, 20)}...` :
                      '未绑定'
                    }
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    注册时间
                  </label>
                  <p className="mt-1 text-base">
                    {formatDate(selectedUser.createdAt)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    最后登录
                  </label>
                  <p className="mt-1 text-base">
                    {formatDate(selectedUser.lastLogin)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    管理员权限
                  </label>
                  <p className="mt-1 text-base">
                    {selectedUser.isAdmin ? '是' : '否'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    登录方式
                  </label>
                  <p className="mt-1 text-base">
                    {getLoginType(selectedUser)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
