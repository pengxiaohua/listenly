'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { CustomPagination } from '@/components/ui/pagination'
import { toast } from 'sonner'
import { Trash2, MessageSquare } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface Feedback {
  id: string
  userId: string
  title: string
  content: string
  createdAt: string
}

export default function FeedbackAdminPage() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const pageSize = 20
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const loadFeedbacks = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/feedback?page=${page}&pageSize=${pageSize}`)
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
                  <TableHead>标题</TableHead>
                  <TableHead>用户ID</TableHead>
                  <TableHead>提交时间</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {feedbacks.map(feedback => (
                  <TableRow key={feedback.id}>
                    <TableCell className="font-medium">
                      <button
                        onClick={() => handleViewDetail(feedback)}
                        className="text-blue-600 hover:text-blue-800 hover:underline text-left"
                      >
                        {feedback.title}
                      </button>
                    </TableCell>
                    <TableCell className="font-mono text-sm text-gray-600">
                      {feedback.userId.substring(0, 8)}...
                    </TableCell>
                    <TableCell>{formatDate(feedback.createdAt)}</TableCell>
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>反馈详情</DialogTitle>
          </DialogHeader>
          {selectedFeedback && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  标题
                </label>
                <p className="mt-1 text-base">{selectedFeedback.title}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  内容
                </label>
                <p className="mt-1 text-base whitespace-pre-wrap">{selectedFeedback.content}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    用户ID
                  </label>
                  <p className="mt-1 text-sm font-mono text-gray-600 dark:text-gray-400">
                    {selectedFeedback.userId}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    提交时间
                  </label>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    {formatDate(selectedFeedback.createdAt)}
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
