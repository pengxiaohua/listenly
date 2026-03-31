'use client'

const levelColors: Record<string, string> = {
  A1: 'border-green-500 text-green-500',
  A2: 'border-green-600 text-green-600',
  B1: 'border-blue-500 text-blue-500',
  B2: 'border-blue-600 text-blue-600',
  C1: 'border-purple-500 text-purple-500',
  C2: 'border-purple-600 text-purple-600',
}

interface LevelBadgeProps {
  level?: string | null
  className?: string
}

export default function LevelBadge({ level, className = '' }: LevelBadgeProps) {
  if (!level) return null
  const color = levelColors[level] || 'border-slate-500 text-slate-500'
  return (
    <span className={`text-xs bg-transparent border rounded-full px-3 py-[3px] ${color} ${className}`}>
      {level}
    </span>
  )
}
