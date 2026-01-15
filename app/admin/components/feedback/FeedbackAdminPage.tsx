'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { CustomPagination } from '@/components/ui/pagination'
import { toast } from 'sonner'
import { Trash2, MessageSquare } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import Image from 'next/image'
import { Textarea } from '@/components/ui/textarea'

interface Feedback {
  id: string
  userId: string
  user?: { userName: string; avatar: string }
  title: string
  content: string
  type: string // "bug" | "feature"
  imageUrl?: string
  createdAt: string
  reply?: string
  replyAt?: string
}

export default function FeedbackAdminPage() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const pageSize = 20
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const [replyContent, setReplyContent] = useState("")
  const [replying, setReplying] = useState(false)

  const loadFeedbacks = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/feedback?page=${page}&pageSize=${pageSize}`, {
          headers: { 'x-user-id': 'admin-placeholder' } // Ensure handled by middleware or passing correctly if admin
          // Actually, if we are in admin page, we are logged in. Client fetch will carry cookie.
          // BUT my api/feedback relies on x-user-id header which middleware sets.
          // If I call fetch from client, middleware runs? Yes.
      })
      const data = await res.json()
      if (data.success) {
        setFeedbacks(data.data)
        setTotal(data.pagination.total)
      } else {
        toast.error(data.message || '加载反馈列表失败')
      }
    } catch (error) {
      console.error('加载反馈列表失败:', error)
      toast.error('加载反馈列表失败')
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    loadFeedbacks()
  }, [loadFeedbacks])

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这条反馈吗？')) return

    try {
      const res = await fetch(`/api/feedback?id=${id}`, {
        method: 'DELETE'
      })
      const data = await res.json()
      if (data.success) {
        toast.success('删除成功')
        loadFeedbacks()
        if (selectedFeedback?.id === id) setDialogOpen(false)
      } else {
        toast.error(data.message || '删除失败')
      }
    } catch (error) {
      console.error('删除反馈失败:', error)
      toast.error('删除失败')
    }
  }

  const handleViewDetail = (feedback: Feedback) => {
    setSelectedFeedback(feedback)
    setReplyContent(feedback.reply || "")
    setDialogOpen(true)
  }

  const handleReplySubmit = async () => {
    if (!selectedFeedback) return;
    if (!replyContent.trim()) {
        toast.error("回复内容不能为空");
        return;
    }

    setReplying(true);
    try {
        const res = await fetch('/api/feedback', {
            method: 'PUT',
            body: JSON.stringify({ id: selectedFeedback.id, reply: replyContent }),
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();
        if (data.success) {
            toast.success("回复成功");
            // Update local state
            setFeedbacks(prev => prev.map(f => f.id === selectedFeedback.id ? { ...f, reply: replyContent, replyAt: new Date().toISOString() } : f));
            setSelectedFeedback(prev => prev ? { ...prev, reply: replyContent, replyAt: new Date().toISOString() } : null);
        } else {
            toast.error(data.message || "回复失败");
        }
    } catch (e) {
        console.error('回复失败:', e)
        toast.error("回复失败");
    } finally {
        setReplying(false);
    }
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

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">反馈管理</h2>
        <div className="text-sm text-gray-600">
          共 {total} 条反馈
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">加载中...</div>
      ) : feedbacks.length === 0 ? (
        <div className="bg-gray-100 dark:bg-gray-800 p-8 rounded-lg text-center">
          <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600 dark:text-gray-400">暂无反馈</p>
        </div>
      ) : (
        <>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>类型</TableHead>
                  <TableHead>标题</TableHead>
                  <TableHead>用户</TableHead>
                  <TableHead>提交时间</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {feedbacks.map(feedback => (
                  <TableRow key={feedback.id}>
                    <TableCell>
                        <span className={`px-2 py-1 rounded text-xs ${feedback.type === 'feature' ? 'bg-secondary text-secondary-foreground' : 'bg-red-100 text-red-700'}`}>
                            {feedback.type === 'feature' ? '建议' : '问题'}
                        </span>
                    </TableCell>
                    <TableCell className="font-medium max-w-[200px] truncate">
                      <button
                        onClick={() => handleViewDetail(feedback)}
                        className="text-blue-600 hover:text-blue-800 hover:underline text-left truncate w-full"
                      >
                        {feedback.title}
                      </button>
                    </TableCell>
                    <TableCell className="font-mono text-sm text-gray-600">
                      <div className="flex flex-col">
                          <span>{feedback.user?.userName || '未知用户'}</span>
                          <span className="text-xs text-gray-400">{feedback.userId.substring(0, 8)}...</span>
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(feedback.createdAt)}</TableCell>
                    <TableCell>
                        {feedback.reply ? (
                            <span className="px-2 py-1 rounded text-xs bg-green-50 text-green-700 border border-green-200">已回复</span>
                        ) : (
                            <span className="px-2 py-1 rounded text-xs bg-gray-50 text-gray-500 border border-gray-200">待处理</span>
                        )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(feedback.id)}
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>反馈详情</DialogTitle>
          </DialogHeader>
          {selectedFeedback && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                  <span className="px-2 py-1 rounded text-sm bg-gray-100 text-gray-700">
                    {selectedFeedback.type === 'feature' ? '功能建议' : '问题反馈'}
                  </span>
                  <span className="text-sm text-gray-500">
                      {formatDate(selectedFeedback.createdAt)}
                  </span>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  标题
                </label>
                <p className="mt-1 text-lg font-semibold">{selectedFeedback.title}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  内容
                </label>
                <div className="mt-2 p-4 bg-gray-50 dark:bg-gray-900 rounded-md whitespace-pre-wrap text-base">
                    {selectedFeedback.content}
                </div>
              </div>

              {selectedFeedback.imageUrl && (
                  <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        截图
                      </label>
                      <div className="mt-2">
                          <Image src={selectedFeedback.imageUrl} alt="Feedback" width={160} height={90} className="max-w-full rounded-lg border shadow-sm" />
                      </div>
                  </div>
              )}

              <div className="grid grid-cols-2 gap-4 border-t pt-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    提交用户
                  </label>
                  <div className="mt-1 flex items-center gap-2">
                      <span className="font-semibold">{selectedFeedback.user?.userName}</span>
                      <span className="text-xs text-gray-400 font-mono">({selectedFeedback.userId})</span>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    管理员回复
                  </label>
                  <Textarea
                    value={replyContent}
                    onChange={e => setReplyContent(e.target.value)}
                    placeholder="输入回复内容..."
                    className="min-h-[100px]"
                  />
                  <div className="mt-2 flex justify-end">
                      <Button onClick={handleReplySubmit} disabled={replying}>
                          {replying ? "回复中..." : "发送回复"}
                      </Button>
                  </div>
                  {selectedFeedback.replyAt && (
                      <p className="text-xs text-right text-gray-500 mt-2">
                          上次回复于: {formatDate(selectedFeedback.replyAt)}
                      </p>
                  )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
