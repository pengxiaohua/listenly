'use client'

import { useState, useRef, useEffect } from 'react'
import { Filter, Check } from 'lucide-react'

export type LevelType = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'
export type ProFilterType = 'free' | 'pro'

const LEVELS: LevelType[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
const PRO_OPTIONS: { value: ProFilterType; label: string }[] = [
  { value: 'free', label: '免费' },
  { value: 'pro', label: '会员' },
]

interface CourseFilterProps {
  selectedLevels: LevelType[]
  selectedProFilters: ProFilterType[]
  onLevelsChange: (levels: LevelType[]) => void
  onProFiltersChange: (filters: ProFilterType[]) => void
  className?: string
  size?: 'sm' | 'md'
}

export default function CourseFilter({
  selectedLevels,
  selectedProFilters,
  onLevelsChange,
  onProFiltersChange,
  className = '',
  size = 'md',
}: CourseFilterProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const isSmall = size === 'sm'

  const activeCount = selectedLevels.length + selectedProFilters.length

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const toggleLevel = (level: LevelType) => {
    if (selectedLevels.includes(level)) {
      onLevelsChange(selectedLevels.filter(l => l !== level))
    } else {
      onLevelsChange([...selectedLevels, level])
    }
  }

  const togglePro = (filter: ProFilterType) => {
    if (selectedProFilters.includes(filter)) {
      onProFiltersChange(selectedProFilters.filter(f => f !== filter))
    } else {
      onProFiltersChange([...selectedProFilters, filter])
    }
  }

  return (
    <div className={className + (isSmall ? ' p-0.5 relative' : ' p-1 relative')} ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center rounded-full whitespace-nowrap transition-colors cursor-pointer bg-slate-200/80 dark:bg-slate-800/30 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 ${isSmall ? 'px-3 py-1' : 'px-4 py-2'}`}
      >
        <Filter className={isSmall ? 'w-3 h-3 font-medium' : 'w-4 h-4 font-medium'} />
        <span className={`font-medium ${isSmall ? 'ml-1.5 text-xs' : 'ml-2 text-sm'}`}>筛选</span>
        {activeCount > 0 && (
          <span className={`ml-1.5 bg-indigo-500 text-white rounded-full flex items-center justify-center ${isSmall ? 'text-[10px] w-4 h-4' : 'text-xs w-5 h-5'}`}>
            {activeCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-4 w-61">
          {/* 会员/免费 */}
          <div className="mb-3">
            <div className="text-sm text-slate-600 mb-2 font-medium">课程类型</div>
            <div className="flex flex-wrap gap-2">
              {PRO_OPTIONS.map(opt => {
                const active = selectedProFilters.includes(opt.value)
                return (
                  <button
                    key={opt.value}
                    onClick={() => togglePro(opt.value)}
                    className={`w-16 px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer flex justify-center items-center gap-1 ${
                      active
                        ? 'bg-indigo-500 text-white'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                    }`}
                  >
                    {active && <Check className="w-3 h-3" />}
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>
          {/* 课程等级 */}
          <div>
            <div className="text-sm text-slate-600 mb-2 font-medium">课程等级</div>
            <div className="flex flex-wrap gap-2">
              {LEVELS.map(level => {
                const active = selectedLevels.includes(level)
                return (
                  <button
                    key={level}
                    onClick={() => toggleLevel(level)}
                    className={`w-16 px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer flex justify-center items-center gap-1 ${
                      active
                        ? 'bg-indigo-500 text-white'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                    }`}
                  >
                    {active && <Check className="w-3 h-3" />}
                    {level}
                  </button>
                )
              })}
            </div>
          </div>
          {/* 清除按钮 */}
          {activeCount > 0 && (
            <button
              onClick={() => { onLevelsChange([]); onProFiltersChange([]) }}
              className="mt-3 text-xs float-right text-indigo-500 hover:text-indigo-600 cursor-pointer"
            >
              清除所有筛选
            </button>
          )}
        </div>
      )}
    </div>
  )
}
