'use client'

import { LayoutGrid, List, Play, ChevronLeft } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'

interface ExitPracticeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onBackToCourseList: () => void
  onBackToCourseDetail?: () => void
  onContinue: () => void
  showBackToCourseDetail?: boolean
}

export default function ExitPracticeDialog({
  open,
  onOpenChange,
  onBackToCourseList,
  onBackToCourseDetail,
  onContinue,
  showBackToCourseDetail = true
}: ExitPracticeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogTitle className="flex items-center justify-between text-lg font-bold">
          <span>退出练习</span>
        </DialogTitle>

        <div className="mt-4">
          {/* 提示信息框 */}
          <div className="bg-blue-100 rounded-lg p-4 mb-6">
            <p className="text-blue-700 text-center">
              休息一会，继续学习!
            </p>
          </div>

          {/* 选项列表 */}
          <div className="space-y-3 mb-6">
            {/* 返回所有课程列表 */}
            <button
              onClick={onBackToCourseList}
              className="w-full bg-gray-100 hover:bg-gray-200 rounded-lg p-4 flex items-center justify-between transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <LayoutGrid className="w-5 h-5 text-gray-700" />
                <span className="text-gray-900">返回所有课程</span>
              </div>
              <ChevronLeft className="w-5 h-5 text-gray-700 rotate-180" />
            </button>

            {/* 返回当前课程详情 */}
            {showBackToCourseDetail && onBackToCourseDetail && (
              <button
                onClick={onBackToCourseDetail}
                className="w-full bg-gray-100 hover:bg-gray-200 rounded-lg p-4 flex items-center justify-between transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <List className="w-5 h-5 text-gray-700" />
                  <span className="text-gray-900">返回当前课程</span>
                </div>
                <ChevronLeft className="w-5 h-5 text-gray-700 rotate-180" />
              </button>
            )}
          </div>

          {/* 继续学习按钮 */}
          <button
            onClick={onContinue}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-lg p-4 flex items-center justify-center gap-2 transition-colors font-medium cursor-pointer"
          >
            <Play className="w-5 h-5" />
            <span>继续学习</span>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

