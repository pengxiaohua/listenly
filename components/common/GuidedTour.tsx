'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'

export type TourStep = {
  /** CSS selector for the target element */
  target: string
  /** Title of the step */
  title: string
  /** Description text */
  content: string
  /** Optional image/gif path to display in the tooltip */
  image?: string
  /** Preferred placement of the tooltip */
  placement?: 'top' | 'bottom' | 'left' | 'right'
}

interface GuidedTourProps {
  steps: TourStep[]
  tourKey: string
  onComplete?: () => void
}

type VRect = { top: number; left: number; width: number; height: number; bottom: number; right: number }

const PADDING = 8
const GAP = 12

export default function GuidedTour({ steps, tourKey, onComplete }: GuidedTourProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [visible, setVisible] = useState(false)
  const [targetRect, setTargetRect] = useState<VRect | null>(null)
  const [tooltipCss, setTooltipCss] = useState<React.CSSProperties>({})
  const [arrowStyle, setArrowStyle] = useState<React.CSSProperties>({})
  const [arrowDir, setArrowDir] = useState<'top' | 'bottom' | 'left' | 'right'>('bottom')
  const tooltipRef = useRef<HTMLDivElement>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/user/tour-status?key=${encodeURIComponent(tourKey)}`)
      .then(r => r.ok ? r.json() : { completed: false })
      .then(data => {
        if (cancelled) return
        if (!data.completed) setVisible(true)
        setLoaded(true)
      })
      .catch(() => { if (!cancelled) setLoaded(true) })
    return () => { cancelled = true }
  }, [tourKey])

  // Phase 1: find target element and set targetRect (no tooltip ref needed)
  const updateTargetRect = useCallback(() => {
    const step = steps[currentStep]
    if (!step) return
    const el = document.querySelector(step.target)
    if (!el) return
    const r = el.getBoundingClientRect()
    setTargetRect({ top: r.top, left: r.left, width: r.width, height: r.height, bottom: r.bottom, right: r.right })
  }, [currentStep, steps])

  // Phase 2: position tooltip relative to target (needs tooltip ref)
  const positionTooltip = useCallback(() => {
    const step = steps[currentStep]
    if (!step) return
    const el = document.querySelector(step.target)
    if (!el) return
    const tooltip = tooltipRef.current
    if (!tooltip) return

    const r = el.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight

    // Also refresh targetRect
    setTargetRect({ top: r.top, left: r.left, width: r.width, height: r.height, bottom: r.bottom, right: r.right })

    const tw = tooltip.offsetWidth
    const th = tooltip.offsetHeight
    const mw = Math.min(step.image ? 420 : 360, vw - 32)

    const preferred = step.placement || 'top'
    let actual = preferred
    const css: React.CSSProperties = { position: 'fixed', width: 'max-content', maxWidth: mw, zIndex: 100000 }

    if (preferred === 'top') {
      const bottomAnchor = vh - r.top + GAP
      if (r.top - GAP - th < 8) {
        actual = 'bottom'
        css.top = r.bottom + GAP
      } else {
        actual = 'top'
        css.bottom = bottomAnchor
      }
      let left = r.left + r.width / 2 - tw / 2
      left = Math.max(8, Math.min(left, vw - tw - 8))
      css.left = left
    } else if (preferred === 'bottom') {
      if (r.bottom + GAP + th > vh - 8) {
        actual = 'top'
        css.bottom = vh - r.top + GAP
      } else {
        actual = 'bottom'
        css.top = r.bottom + GAP
      }
      let left = r.left + r.width / 2 - tw / 2
      left = Math.max(8, Math.min(left, vw - tw - 8))
      css.left = left
    } else if (preferred === 'right') {
      if (r.right + GAP + tw > vw - 8) {
        actual = 'left'
        css.right = vw - r.left + GAP
      } else {
        actual = 'right'
        css.left = r.right + GAP
      }
      let top = r.top + r.height / 2 - th / 2
      top = Math.max(8, Math.min(top, vh - th - 8))
      css.top = top
    } else {
      if (r.left - GAP - tw < 8) {
        actual = 'right'
        css.left = r.right + GAP
      } else {
        actual = 'left'
        css.right = vw - r.left + GAP
      }
      let top = r.top + r.height / 2 - th / 2
      top = Math.max(8, Math.min(top, vh - th - 8))
      css.top = top
    }

    setTooltipCss(css)
    setArrowDir(actual === 'top' ? 'bottom' : actual === 'bottom' ? 'top' : actual === 'left' ? 'right' : 'left')

    const arrowPos: React.CSSProperties = { position: 'absolute' }
    if (actual === 'top' || actual === 'bottom') {
      const tooltipLeft = typeof css.left === 'number' ? css.left : 0
      const arrowLeft = r.left + r.width / 2 - tooltipLeft
      arrowPos.left = Math.max(16, Math.min(arrowLeft, tw - 16))
      if (actual === 'top') arrowPos.bottom = -6
      else arrowPos.top = -6
    } else {
      const tooltipTop = typeof css.top === 'number' ? css.top : r.top + r.height / 2 - th / 2
      const arrowTop = r.top + r.height / 2 - tooltipTop
      arrowPos.top = Math.max(16, Math.min(arrowTop, th - 16))
      if (actual === 'left') arrowPos.right = -6
      else arrowPos.left = -6
    }
    setArrowStyle(arrowPos)
  }, [currentStep, steps])

  // When visible, first set targetRect so the tooltip DOM mounts
  useEffect(() => {
    if (!visible) return
    updateTargetRect()
  }, [visible, updateTargetRect])

  // Once targetRect is set and tooltip is mounted, position it; also observe resize
  useEffect(() => {
    if (!visible || !targetRect) return

    // Use rAF to wait for tooltip to mount after targetRect triggers render
    const rafId = requestAnimationFrame(() => positionTooltip())

    const tooltip = tooltipRef.current
    let ro: ResizeObserver | null = null
    if (tooltip) {
      ro = new ResizeObserver(() => positionTooltip())
      ro.observe(tooltip)
    }

    window.addEventListener('resize', positionTooltip)
    window.addEventListener('scroll', positionTooltip, true)
    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', positionTooltip)
      window.removeEventListener('scroll', positionTooltip, true)
      ro?.disconnect()
    }
  }, [visible, targetRect, positionTooltip])

  const completeTour = useCallback(async () => {
    setVisible(false)
    try {
      await fetch('/api/user/tour-status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: tourKey }),
      })
    } catch { /* ignore */ }
    onComplete?.()
  }, [tourKey, onComplete])

  const handleNext = () => {
    if (currentStep < steps.length - 1) setCurrentStep(prev => prev + 1)
    else completeTour()
  }

  if (!loaded || !visible || !targetRect) return null

  const step = steps[currentStep]

  const arrowCls =
    arrowDir === 'top'
      ? 'border-b-white dark:border-b-gray-800 border-l-transparent border-r-transparent border-t-transparent'
      : arrowDir === 'bottom'
        ? 'border-t-white dark:border-t-gray-800 border-l-transparent border-r-transparent border-b-transparent'
        : arrowDir === 'left'
          ? 'border-r-white dark:border-r-gray-800 border-t-transparent border-b-transparent border-l-transparent'
          : 'border-l-white dark:border-l-gray-800 border-t-transparent border-b-transparent border-r-transparent'

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999 }}>
      {/* Spotlight */}
      <div
        style={{
          position: 'fixed',
          top: targetRect.top - PADDING,
          left: targetRect.left - PADDING,
          width: targetRect.width + PADDING * 2,
          height: targetRect.height + PADDING * 2,
          borderRadius: 8,
          boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
          pointerEvents: 'none',
          transition: 'all 0.3s ease',
        }}
      />

      {/* Click blocker */}
      <div style={{ position: 'fixed', inset: 0, cursor: 'default' }} onClick={e => e.stopPropagation()} />

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="bg-blue-400 dark:bg-gray-800 rounded-xl shadow-2xl p-3"
        style={tooltipCss}
      >
        {/* 暂时不需要小三角形 */}
        {/* <div style={{ ...arrowStyle, width: 0, height: 0, borderWidth: 6, borderStyle: 'solid' }} className={arrowCls} /> */}

        {step.image && (
          <div className="mb-3 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600">
            <img src={step.image} alt={step.title} className="w-full h-auto" draggable={false} />
          </div>
        )}

        <div className="text-base font-bold text-white mb-2">{step.title}</div>
        <div className="text-sm font-semibold text-white dark:text-gray-400 mb-3 leading-relaxed">{step.content}</div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-white">{currentStep + 1} / {steps.length}</span>
          <div className="flex items-center gap-2">
            <button onClick={completeTour} className="text-sm text-white font-semibold dark:hover:text-gray-300 cursor-pointer px-2 py-1">
              跳过
            </button>
            <button onClick={handleNext} className="px-3 py-2 bg-white text-blue-400 font-semibold text-sm rounded-md cursor-pointer transition-colors">
              {currentStep < steps.length - 1 ? '下一步' : '知道了'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
