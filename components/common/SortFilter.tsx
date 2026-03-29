'use client'

import { ListFilter, Check } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export type SortType = 'popular' | 'latest' | 'name'

interface SortFilterProps {
  sortBy: SortType
  onSortChange: (sortType: SortType) => void
  className?: string
  size?: 'sm' | 'md'
}

const sortOptions: Array<{ value: SortType; label: string }> = [
  { value: 'popular', label: '最受欢迎' },
  { value: 'latest', label: '最新课程' },
  { value: 'name', label: '标题排序' },
]

export default function SortFilter({ sortBy, onSortChange, className = '', size = 'md' }: SortFilterProps) {
  const isSmall = size === 'sm'
  return (
    <div className={className + (isSmall ? ' p-0.5' : ' p-1')}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className={`flex items-center rounded-full whitespace-nowrap transition-colors cursor-pointer bg-slate-200/80 dark:bg-slate-800/30 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 ${isSmall ? 'px-3 py-1' : 'px-4 py-2'}`}
          >
            <ListFilter className={isSmall ? 'w-3 h-3 font-medium' : 'w-4 h-4 font-medium'} />
            <span className={`ml-1.5 font-medium ${isSmall ? 'text-xs' : 'ml-2 text-sm'}`}>排序</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-30">
          {sortOptions.map((option) => (
            <DropdownMenuItem
              key={option.value}
              onClick={() => onSortChange(option.value)}
              className="flex items-center justify-between cursor-pointer"
            >
              <span>{option.label}</span>
              {sortBy === option.value && <Check className="w-4 h-4" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
