
'use client'

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import Image from 'next/image'
import { Settings, MessageSquareText, GripHorizontal } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { LiquidTabs } from '@/components/ui/liquid-tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useUserConfigStore } from '@/store/userConfig'
import { useTheme } from '@/components/common/ThemeProvider'
import { FeedbackDialog } from '@/components/common/FeedbackDialog'

const WRONG_SOUNDS = ['wrong.mp3', 'wrong02.mp3', 'wrong_0.5vol.mp3']
const CORRECT_SOUNDS = ['correct.mp3', 'correct02.mp3', 'correct03.mp3', 'correct04.mp3', 'correct_0.5vol.mp3']

type Position = { x: number; y: number }

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

export default function GlobalConfigFloat() {
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'sound' | 'learning'>('sound')
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 })
  const initializedRef = useRef(false)
  const draggingRef = useRef<{
    startX: number
    startY: number
    originX: number
    originY: number
  } | null>(null)
  const [feedbackOpen, setFeedbackOpen] = useState(false)

  const config = useUserConfigStore(state => state.config)
  const updateConfig = useUserConfigStore(state => state.updateConfig)
  const volumePreviewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { theme, setTheme } = useTheme()

  // 播放音效预览
  const playSoundPreview = (soundFile: string, volume: number) => {
    const audio = new Audio(`/sounds/${soundFile}`)
    audio.volume = Math.max(0, Math.min(1, volume))
    audio.play().catch(error => {
      console.error('播放音效失败:', error)
    })
  }

  // 防抖播放音效预览（用于音量滑块）
  const playSoundPreviewDebounced = (soundFile: string, volume: number, delay: number = 300) => {
    if (volumePreviewTimerRef.current) {
      clearTimeout(volumePreviewTimerRef.current)
    }
    volumePreviewTimerRef.current = setTimeout(() => {
      playSoundPreview(soundFile, volume)
    }, delay)
  }

  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true
    const defaultX = window.innerWidth - 48 - 24 // 浮窗宽度48px + 右边距24px
    const defaultY = window.innerHeight - 80 - 120 // hover时高度80px + 下边距120px（避开反馈按钮）
    setPosition({ x: Math.max(16, defaultX), y: Math.max(16, defaultY) })
  }, [])

  useEffect(() => {
    const handleResize = () => {
      const maxX = window.innerWidth - 48 // w-12 = 48px
      const maxY = window.innerHeight - 80 // hover时 h-20 = 80px
      setPosition(prev => ({
        x: clamp(prev.x, 16, maxX),
        y: clamp(prev.y, 16, maxY)
      }))
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    // 如果点击的是配置按钮，不拖动
    if ((event.target as HTMLElement).closest('[data-config-button]')) return
    // 如果点击的是 Tooltip 相关元素，不拖动
    if ((event.target as HTMLElement).closest('[data-slot="tooltip"]')) return
    draggingRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      originX: position.x,
      originY: position.y
    }
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
  }

  const handlePointerMove = (event: PointerEvent) => {
    if (!draggingRef.current) return
    const { startX, startY, originX, originY } = draggingRef.current
    const nextX = originX + (event.clientX - startX)
    const nextY = originY + (event.clientY - startY)
    const maxX = window.innerWidth - 48 // w-12 = 48px
    const maxY = window.innerHeight - 80 // hover时 h-20 = 80px
    setPosition({
      x: clamp(nextX, 16, maxX),
      y: clamp(nextY, 16, maxY)
    })
  }

  const handlePointerUp = () => {
    draggingRef.current = null
    window.removeEventListener('pointermove', handlePointerMove)
    window.removeEventListener('pointerup', handlePointerUp)
    const maxX = window.innerWidth - 48 - 12 // 不完全靠边，吸附回到距离右侧12px位置
    setPosition(prev => {
      const distanceRight = maxX - prev.x
      if (distanceRight > 160) {
        return { x: maxX, y: prev.y }
      }
      return prev
    })
  }

  return (
    <>
      <div
        className="fixed z-50 group"
        style={{ left: position.x, top: position.y }}
      >
        <div
          className="flex flex-col items-center gap-2 w-11 h-17 hover:h-29 transition-[height] duration-200 overflow-hidden bg-gray-100 dark:bg-gray-200 border border-gray-200 dark:border-gray-800 shadow-lg rounded-full px-2 py-2 cursor-move"
          onPointerDown={handlePointerDown}
        >
          <div className="flex-shrink-0 select-none flex flex-col items-center gap-2">
            <Image
              src="/images/logo.png"
              alt="Listenly"
              width={28}
              height={28}
              className="rounded-full"
              draggable={false}
            />
            <GripHorizontal className="w-4 h-4 text-gray-400 dark:text-gray-500 group-hover:hidden" />
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                data-config-button
                onPointerDown={(event) => event.stopPropagation()}
                onClick={() => setOpen(true)}
                className="bg-white w-7 h-7 flex justify-center items-center rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-gray-600 hover:text-blue-600 flex-shrink-0 cursor-pointer"
              >
                <Settings className="w-4 h-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left" sideOffset={6}>全局配置</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                data-config-button
                onPointerDown={(event) => event.stopPropagation()}
                onClick={() => setFeedbackOpen(true)}
                className="bg-white w-7 h-7 flex justify-center items-center rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-gray-600 hover:text-blue-600 flex-shrink-0 cursor-pointer"
              >
                <MessageSquareText className="w-4 h-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left" sideOffset={6}>提个建议</TooltipContent>
          </Tooltip>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>全局配置</DialogTitle>
          </DialogHeader>

          <LiquidTabs
            items={[
              { value: 'sound', label: '音效设置' },
              { value: 'learning', label: '学习设置' }
            ]}
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as 'sound' | 'learning')}
            size="sm"
          />

          {activeTab === 'sound' ? (
            <div className="space-y-5 mt-4">
              <div className="space-y-2">
                <div className='flex items-center gap-3'>
                <div className="text-sm font-medium">错误提示音</div>
                <Select
                  value={config.sounds.wrongSound}
                  onValueChange={(value) => {
                    updateConfig({ sounds: { wrongSound: value } })
                    // 播放预览音效
                    playSoundPreview(value, config.sounds.wrongVolume)
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择错误提示音" />
                  </SelectTrigger>
                  <SelectContent>
                    {WRONG_SOUNDS.map(sound => (
                      <SelectItem key={sound} value={sound}>{sound}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={config.sounds.wrongVolume}
                    onChange={(event) => {
                      const newVolume = Number(event.target.value)
                      updateConfig({ sounds: { wrongVolume: newVolume } })
                      // 防抖播放预览音效
                      playSoundPreviewDebounced(config.sounds.wrongSound, newVolume)
                    }}
                    className="w-full"
                  />
                  <span className="w-10 text-sm text-gray-500">{config.sounds.wrongVolume.toFixed(1)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className='flex items-center gap-3'>
                <div className="text-sm font-medium">正确提示音</div>
                <Select
                  value={config.sounds.correctSound}
                  onValueChange={(value) => {
                    updateConfig({ sounds: { correctSound: value } })
                    // 播放预览音效
                    playSoundPreview(value, config.sounds.correctVolume)
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择正确提示音" />
                  </SelectTrigger>
                  <SelectContent>
                    {CORRECT_SOUNDS.map(sound => (
                      <SelectItem key={sound} value={sound}>{sound}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={config.sounds.correctVolume}
                    onChange={(event) => {
                      const newVolume = Number(event.target.value)
                      updateConfig({ sounds: { correctVolume: newVolume } })
                      // 防抖播放预览音效
                      playSoundPreviewDebounced(config.sounds.correctSound, newVolume)
                    }}
                    className="w-full"
                  />
                  <span className="w-10 text-sm text-gray-500">{config.sounds.correctVolume.toFixed(1)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium">按键提示音</div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={config.sounds.typingVolume}
                    onChange={(event) => {
                      const newVolume = Number(event.target.value)
                      updateConfig({ sounds: { typingVolume: newVolume } })
                      // 防抖播放预览音效（按键提示音固定为 typing.mp3）
                      playSoundPreviewDebounced('typing.mp3', newVolume)
                    }}
                    className="w-full"
                  />
                  <span className="w-10 text-sm text-gray-500">{config.sounds.typingVolume.toFixed(1)}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6 mt-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">暗黑模式</div>
                  <div className="text-xs text-gray-500">开启暗黑主题</div>
                </div>
                <Switch
                  checked={theme === 'dark'}
                  onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">显示单词音标</div>
                  <div className="text-xs text-gray-500">仅影响单词拼写页面</div>
                </div>
                <Switch
                  checked={config.learning.showPhonetic}
                  onCheckedChange={(checked) => updateConfig({ learning: { showPhonetic: checked } })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">显示翻译</div>
                  <div className="text-xs text-gray-500">影响单词拼写与句子听写</div>
                </div>
                <Switch
                  checked={config.learning.showTranslation}
                  onCheckedChange={(checked) => updateConfig({ learning: { showTranslation: checked } })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">空格与回车键切换</div>
                  <div className="text-xs text-gray-500">
                    当前：空格键={config.learning.swapShortcutKeys ? '校验' : '朗读'}，回车键={config.learning.swapShortcutKeys ? '朗读' : '校验'}
                  </div>
                </div>
                <Switch
                  checked={config.learning.swapShortcutKeys ?? false}
                  onCheckedChange={(checked) => updateConfig({ learning: { swapShortcutKeys: checked } })}
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 反馈对话框 */}
      <FeedbackDialog
        isOpen={feedbackOpen}
        onOpenChange={setFeedbackOpen}
      />
    </>
  )
}
