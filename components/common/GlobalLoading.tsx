'use client'

import Image from 'next/image'
import { useGlobalLoadingStore } from '@/store/globalLoading'
import { cn } from '@/lib/utils'

interface GlobalLoadingProps {
  className?: string
}

export default function GlobalLoading({ className }: GlobalLoadingProps) {
  const visible = useGlobalLoadingStore(state => state.visible)
  const message = useGlobalLoadingStore(state => state.message)

  if (!visible) return null

  return (
    <div className={cn(
      'fixed inset-0 z-[1000] flex items-center justify-center',
      'bg-background/70 backdrop-blur-sm',
      className
    )}>
      <div className="flex flex-col items-center gap-4 select-none">
        <Image
          src="/images/echo.svg"
          alt="Loading"
          width={60}
          height={60}
          className="animate-spin-x"
          priority
        />
        {message && (
          <div className="text-base text-muted-foreground">
            {message}
          </div>
        )}
      </div>
    </div>
  )
}


