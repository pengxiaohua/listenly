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
}

const sortOptions: Array<{ value: SortType; label: string }> = [
  { value: 'popular', label: '最受欢迎' },
  { value: 'latest', label: '最新课程' },
  { value: 'name', label: '标题排序' },
]

export default function SortFilter({ sortBy, onSortChange, className = '' }: SortFilterProps) {
  return (
    <div className={className + ' p-1'}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="px-4 py-2 flex items-center rounded-full whitespace-nowrap transition-colors cursor-pointer bg-gray-200/80 dark:bg-gray-800/30 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            <ListFilter className='w-4 h-4 font-medium' />
            <span className="ml-2 text-sm font-medium">排序</span>
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
