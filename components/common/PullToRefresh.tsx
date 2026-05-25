'use client'

import React, { useRef, useState, useCallback, useEffect } from 'react'
import { useIsMobile } from '@/lib/useIsMobile'

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void
  children: React.ReactNode
  /** 触发刷新的下拉距离阈值，默认 60px */
  threshold?: number
  /** 最大下拉距离，默认 100px */
  maxPull?: number
  /** 是否禁用，默认 false */
  disabled?: boolean
}

/**
 * 移动端下拉刷新组件（仅在屏幕宽度 <= 768px 时生效）
 * 包裹页面内容，当用户在页面顶部下拉时触发刷新回调。
 */
export default function PullToRefresh({
  onRefresh,
  children,
  threshold = 60,
  maxPull = 100,
  disabled = false,
}: PullToRefreshProps) {
  const isMobile = useIsMobile(769) // <= 768px
  const containerRef = useRef<HTMLDivElement>(null)
  const [pullDistance, setPullDistance] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const startYRef = useRef(0)
  const pullingRef = useRef(false)

  const isAtTop = useCallback(() => {
    // 检查页面是否滚动到顶部
    return window.scrollY <= 0
  }, [])

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (disabled || refreshing || !isAtTop()) return
      startYRef.current = e.touches[0].clientY
      pullingRef.current = true
    },
    [disabled, refreshing, isAtTop]
  )

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!pullingRef.current || disabled || refreshing) return
      const currentY = e.touches[0].clientY
      const diff = currentY - startYRef.current

      if (diff > 0 && isAtTop()) {
        // 使用阻尼效果，拉得越远阻力越大
        const dampedDiff = Math.min(diff * 0.4, maxPull)
        setPullDistance(dampedDiff)

        // 防止页面滚动
        if (dampedDiff > 5) {
          e.preventDefault()
        }
      } else {
        setPullDistance(0)
      }
    },
    [disabled, refreshing, isAtTop, maxPull]
  )

  const handleTouchEnd = useCallback(async () => {
    if (!pullingRef.current || disabled) return
    pullingRef.current = false

    if (pullDistance >= threshold && !refreshing) {
      setRefreshing(true)
      setPullDistance(threshold * 0.6) // 保持一个小的偏移显示加载状态
      try {
        await onRefresh()
      } finally {
        setRefreshing(false)
        setPullDistance(0)
      }
    } else {
      setPullDistance(0)
    }
  }, [pullDistance, threshold, refreshing, onRefresh, disabled])

  useEffect(() => {
    if (!isMobile || disabled) return

    const container = containerRef.current
    if (!container) return

    // 使用 passive: false 以便能调用 preventDefault
    container.addEventListener('touchstart', handleTouchStart, { passive: true })
    container.addEventListener('touchmove', handleTouchMove, { passive: false })
    container.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('touchmove', handleTouchMove)
      container.removeEventListener('touchend', handleTouchEnd)
    }
  }, [isMobile, disabled, handleTouchStart, handleTouchMove, handleTouchEnd])

  // 非移动端直接渲染子元素
  if (!isMobile || disabled) {
    return <>{children}</>
  }

  const progress = Math.min(pullDistance / threshold, 1)
  const showIndicator = pullDistance > 5 || refreshing

  return (
    <div ref={containerRef} className="relative">
      {/* 下拉指示器 */}
      <div
        className="absolute left-0 right-0 flex items-center justify-center z-50 pointer-events-none transition-opacity duration-200"
        style={{
          top: 0,
          height: `${pullDistance}px`,
          opacity: showIndicator ? 1 : 0,
        }}
      >
        <div className="flex flex-col items-center gap-1">
          {refreshing ? (
            <svg
              className="w-5 h-5 text-indigo-500 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="3"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          ) : (
            <svg
              className="w-5 h-5 text-slate-400 transition-transform duration-200"
              style={{
                transform: `rotate(${progress >= 1 ? 180 : 0}deg)`,
              }}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 5v14M5 12l7 7 7-7" />
            </svg>
          )}
          <span className="text-xs text-slate-400">
            {refreshing ? '刷新中...' : progress >= 1 ? '松开刷新' : '下拉刷新'}
          </span>
        </div>
      </div>

      {/* 内容区域 */}
      <div
        className="transition-transform duration-200 ease-out"
        style={{
          transform: `translateY(${pullDistance}px)`,
          transitionDuration: pullingRef.current ? '0ms' : '200ms',
        }}
      >
        {children}
      </div>
    </div>
  )
}
