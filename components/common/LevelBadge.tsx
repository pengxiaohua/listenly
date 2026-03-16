'use client'

const levelColors: Record<string, string> = {
  A1: 'bg-green-500',
  A2: 'bg-green-600',
  B1: 'bg-blue-500',
  B2: 'bg-blue-600',
  C1: 'bg-purple-500',
  C2: 'bg-purple-600',
}

interface LevelBadgeProps {
  level?: string | null
  className?: string
}

export default function LevelBadge({ level, className = '' }: LevelBadgeProps) {
  if (!level) return null
  const color = levelColors[level] || 'bg-slate-500'
  return (
    <span className={`text-xs text-white rounded-full px-3 py-1 ${color} ${className}`}>
      {level}
    </span>
  )
}
