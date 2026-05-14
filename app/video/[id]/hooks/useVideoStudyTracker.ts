import { useEffect, useRef, type RefObject } from 'react'
import {
  VIDEO_HEARTBEAT_INTERVAL_MS,
  VIDEO_ACTIVE_IDLE_TIMEOUT_MS,
} from '@/lib/constants'

interface UseVideoStudyTrackerOptions {
  /** 数字型视频 ID（VideoRecord.videoId）。未就绪时传 null/undefined */
  videoId: number | null | undefined
  /** 视频元素引用，用于在 tab 不可见时主动暂停 */
  videoRef: RefObject<HTMLVideoElement | null>
}

/**
 * 视听演练学习时长追踪：
 * - playedSeconds：视频处于 playing 状态累计秒数（按墙上时间，不乘倍速）
 * - activeSeconds：页面可见 + 标签页聚焦 + 近 60s 有交互的累计秒数
 * - 互斥：每秒只算一次，优先 played
 * - tab 不可见时主动暂停视频
 * - 心跳：每 30s 上报增量；pagehide 用 sendBeacon 兜底
 */
export function useVideoStudyTracker({ videoId, videoRef }: UseVideoStudyTrackerOptions) {
  // 累积器
  const playedRef = useRef(0)
  const activeRef = useRef(0)

  // 状态标志
  const isPlayingRef = useRef(false)
  const isVisibleRef = useRef(typeof document !== 'undefined' ? !document.hidden : true)
  const isFocusedRef = useRef(typeof document !== 'undefined' ? document.hasFocus() : true)
  const lastInteractionAtRef = useRef(Date.now())

  useEffect(() => {
    if (!videoId) return
    const video = videoRef.current
    if (!video) return

    const isActive = () => {
      if (!isVisibleRef.current || !isFocusedRef.current) return false
      return Date.now() - lastInteractionAtRef.current <= VIDEO_ACTIVE_IDLE_TIMEOUT_MS
    }

    // 1s tick：累计 played / active
    const tickTimer = window.setInterval(() => {
      if (isPlayingRef.current) {
        playedRef.current += 1
      } else if (isActive()) {
        activeRef.current += 1
      }
    }, 1000)

    // 心跳上报
    const flush = (useBeacon = false) => {
      const played = playedRef.current
      const active = activeRef.current
      if (played === 0 && active === 0) return
      playedRef.current = 0
      activeRef.current = 0

      const payload = {
        videoId,
        playedSeconds: played,
        activeSeconds: active,
      }
      const url = '/api/video/study-progress'

      if (useBeacon && typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
        const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' })
        navigator.sendBeacon(url, blob)
        return
      }
      // 页面卸载时无法 await，fire-and-forget 即可
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => { /* 忽略：下次心跳会补 */ })
    }

    const heartbeatTimer = window.setInterval(() => flush(false), VIDEO_HEARTBEAT_INTERVAL_MS)

    // 视频事件
    const onPlay = () => { isPlayingRef.current = true }
    const onPause = () => { isPlayingRef.current = false }
    const onEnded = () => { isPlayingRef.current = false }
    video.addEventListener('play', onPlay)
    video.addEventListener('playing', onPlay)
    video.addEventListener('pause', onPause)
    video.addEventListener('ended', onEnded)

    // tab 可见性 / 焦点：不可见或失焦时暂停视频，停止累计
    const onVisibilityChange = () => {
      isVisibleRef.current = !document.hidden
      if (!isVisibleRef.current && !video.paused) {
        try { video.pause() } catch { /* ignore */ }
      }
    }
    const onWindowFocus = () => { isFocusedRef.current = true }
    const onWindowBlur = () => {
      isFocusedRef.current = false
      if (!video.paused) {
        try { video.pause() } catch { /* ignore */ }
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('focus', onWindowFocus)
    window.addEventListener('blur', onWindowBlur)

    // 用户交互：刷新 lastInteractionAt
    const markInteraction = () => { lastInteractionAtRef.current = Date.now() }
    const interactionEvents: Array<keyof WindowEventMap> = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart']
    interactionEvents.forEach(evt => {
      window.addEventListener(evt, markInteraction, { passive: true })
    })

    // pagehide / beforeunload：用 beacon 兜底
    const onPageHide = () => flush(true)
    window.addEventListener('pagehide', onPageHide)
    window.addEventListener('beforeunload', onPageHide)

    return () => {
      window.clearInterval(tickTimer)
      window.clearInterval(heartbeatTimer)
      video.removeEventListener('play', onPlay)
      video.removeEventListener('playing', onPlay)
      video.removeEventListener('pause', onPause)
      video.removeEventListener('ended', onEnded)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('focus', onWindowFocus)
      window.removeEventListener('blur', onWindowBlur)
      interactionEvents.forEach(evt => window.removeEventListener(evt, markInteraction))
      window.removeEventListener('pagehide', onPageHide)
      window.removeEventListener('beforeunload', onPageHide)
      // 卸载前最后上报一次
      flush(false)
    }
  }, [videoId, videoRef])
}
