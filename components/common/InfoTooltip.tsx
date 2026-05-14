'use client'

import * as React from 'react'
import { Info } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface InfoTooltipProps {
  /** 提示文案 */
  content: React.ReactNode
  /** 图标尺寸（与 lucide 的 className 配合） */
  className?: string
  /** Tooltip 显示位置 */
  side?: 'top' | 'right' | 'bottom' | 'left'
  /** 触发器额外属性 */
  ariaLabel?: string
}

/**
 * 信息提示小图标，支持 hover 与 click（移动端友好）。
 * 默认 0 延迟，便于桌面端 hover 立即显示；点击则在 controlled 模式下切换显隐。
 */
export default function InfoTooltip({
  content,
  className,
  side = 'top',
  ariaLabel = '更多信息',
}: InfoTooltipProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <Tooltip open={open} onOpenChange={setOpen}>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={ariaLabel}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setOpen((v) => !v)
          }}
          className={cn(
            'inline-flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer transition-colors',
            className,
          )}
        >
          <Info className="w-3.5 h-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side={side} className="max-w-[240px]">
        {content}
      </TooltipContent>
    </Tooltip>
  )
}
