'use client'

import { useEffect, useState, useCallback } from 'react'
import dayjs from 'dayjs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { CustomPagination } from '@/components/ui/pagination'

interface AssessmentRecord {
  id: string
  userId: string
  userName: string
  finalVocab: number
  cefrLevel: string
  mode: string
  createdAt: string
}

export default function VocabAssessmentAdminPage() {
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
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">词汇量测评列表</h2>
        <div className="text-sm text-gray-600 dark:text-gray-400">共 {total} 条记录</div>
      </div>

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
                    <TableCell className="text-sm text-gray-500 font-mono">{r.userId.substring(0, 8)}...</TableCell>
                    <TableCell>{r.mode === 'listening' ? '听力' : '阅读'}</TableCell>
                    <TableCell>{r.finalVocab.toLocaleString()}({r.cefrLevel})</TableCell>
                    <TableCell className="text-sm">{dayjs(r.createdAt).format('YYYY-MM-DD HH:mm')}</TableCell>
                  </TableRow>
                ))}
                {records.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-gray-400">暂无数据</TableCell>
                  </TableRow>
                )}
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
    </div>
  )
}
