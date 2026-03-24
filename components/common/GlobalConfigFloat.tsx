
'use client'

import { useEffect, useRef, useState, useCallback, type PointerEvent as ReactPointerEvent } from 'react'
import Image from 'next/image'
import { Settings, MessageSquareText, GripHorizontal } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { LiquidTabs } from '@/components/ui/liquid-tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useUserConfigStore, type VoiceId } from '@/store/userConfig'
import { useTheme } from '@/components/common/ThemeProvider'
import { FeedbackDialog } from '@/components/common/FeedbackDialog'
import { EFFECT_OPTIONS, playConfettiEffect } from '@/lib/confettiEffects'
import { useAuthStore } from '@/store/auth'

const WRONG_SOUNDS = ['wrong.mp3', 'wrong02.mp3', 'wrong_0.5vol.mp3']
const CORRECT_SOUNDS = ['correct.mp3', 'correct02.mp3', 'correct03.mp3', 'correct04.mp3', 'correct_0.5vol.mp3']

type Position = { x: number; y: number }

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

function VoiceCard({ image, title, description, audioSrc, selected, onSelect, playbackRate, disabled }: {
  image: string
  title: string
  description: string
  audioSrc: string
  selected: boolean
  onSelect: () => void
  playbackRate: number
  disabled?: boolean
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)

  const handlePreview = useCallback(() => {
    if (playing && audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      setPlaying(false)
      return
    }
    const audio = new Audio(audioSrc)
    audio.playbackRate = playbackRate
    audioRef.current = audio
    setPlaying(true)
    audio.play().catch(() => setPlaying(false))
    audio.onended = () => setPlaying(false)
  }, [audioSrc, playing, playbackRate])

  return (
    <div className={`relative rounded-lg border p-2.5 flex gap-3 ${
      selected ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-950/30' : 'border-slate-200 dark:border-slate-700'
    } ${disabled ? 'opacity-75' : ''}`}>
      <Image src={image} alt={title} width={48} height={48} className="rounded-full flex-shrink-0 w-12 h-12 object-cover" />
      <div className="flex flex-col gap-1.5 flex-1 min-w-0">
        <span className="text-sm font-medium truncate">{title}</span>
        <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">{description}</p>
      </div>
      <div className="absolute right-3 top-2 flex gap-2 mt-auto">
          {disabled ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  disabled
                  className="px-3 py-1 text-xs rounded-full text-white bg-gray-400 cursor-not-allowed"
                >
                  选择
                </button>
              </TooltipTrigger>
              <TooltipContent>需要会员才能选择</TooltipContent>
            </Tooltip>
          ) : (
            <button
              type="button"
              onClick={onSelect}
              className={`px-3 py-1 text-xs rounded-full text-white cursor-pointer ${
                selected ? 'bg-indigo-600' : 'bg-gray-700 hover:bg-slate-800'
              }`}
            >
              {selected ? '已选' : '选择'}
            </button>
          )}
          <button
            type="button"
            onClick={handlePreview}
            className={`px-3 py-1 text-xs rounded-full text-white cursor-pointer ${
              playing ? 'bg-indigo-600' : 'bg-gray-700 hover:bg-slate-800'
            }`}
          >
            {playing ? '停止' : '试听'}
          </button>
        </div>
    </div>
  )
}

function DefaultVoiceRow({ selected, onSelect, playbackRate }: {
  selected: boolean
  onSelect: () => void
  playbackRate: number
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)

  const handlePreview = useCallback(() => {
    if (playing && audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      setPlaying(false)
      return
    }
    const audio = new Audio('/tones/default_tone.mp3')
    audio.playbackRate = playbackRate
    audioRef.current = audio
    setPlaying(true)
    audio.play().catch(() => setPlaying(false))
    audio.onended = () => setPlaying(false)
  }, [playing, playbackRate])

  return (
    <div
      className={`flex items-center justify-between rounded-lg border px-3 py-2 ${
        selected
          ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-950/30'
          : 'border-slate-200 dark:border-slate-700'
      }`}
    >
      <span className="text-sm">默认发音</span>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onSelect}
          className={`px-3 py-1 text-xs rounded-full text-white cursor-pointer ${
            selected ? 'bg-indigo-600' : 'bg-gray-700 hover:bg-slate-800'
          }`}
        >
          {selected ? '已选' : '选择'}
        </button>
        <button
          type="button"
          onClick={handlePreview}
          className={`px-3 py-1 text-xs rounded-full text-white cursor-pointer ${
            playing ? 'bg-indigo-600' : 'bg-gray-700 hover:bg-slate-800'
          }`}
        >
          {playing ? '停止' : '试听'}
        </button>
      </div>
    </div>
  )
}

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
  const userInfo = useAuthStore(state => state.userInfo)
  const isProUser = userInfo?.isPro ?? false

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
    const defaultY = window.innerHeight - 116 - 60 // 浮窗高度116px + 下边距60px
    setPosition({ x: Math.max(16, defaultX), y: Math.max(16, defaultY) })
  }, [])

  useEffect(() => {
    const handleResize = () => {
      const maxX = window.innerWidth - 48 // w-12 = 48px
      const maxY = window.innerHeight - 116 // h-29 ≈ 116px
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
    const maxY = window.innerHeight - 116 // h-29 ≈ 116px
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
        data-tour="global-config-float"
        style={{ left: position.x, top: position.y }}
      >
        <div
          className="flex flex-col items-center gap-2 w-11 h-29 transition-[height] duration-200 overflow-hidden bg-slate-100 dark:bg-slate-200 border border-slate-200 dark:border-slate-800 shadow-lg rounded-full px-2 py-2 cursor-move"
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
            <GripHorizontal className="w-4 h-4 text-slate-400 dark:text-slate-500 hidden" />
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                data-config-button
                onPointerDown={(event) => event.stopPropagation()}
                onClick={() => setOpen(true)}
                className="bg-white w-7 h-7 flex justify-center items-center rounded-full shadow-md transition-opacity duration-200 text-slate-600 hover:text-indigo-600 flex-shrink-0 cursor-pointer"
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
                className="bg-white w-7 h-7 flex justify-center items-center rounded-full shadow-md transition-opacity duration-200 text-slate-600 hover:text-indigo-600 flex-shrink-0 cursor-pointer"
              >
                <MessageSquareText className="w-4 h-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left" sideOffset={6}>提个建议</TooltipContent>
          </Tooltip>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl md:max-w-3xl">
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
                    <SelectTrigger className="w-44">
                      <SelectValue placeholder="选择错误提示音" />
                    </SelectTrigger>
                    <SelectContent>
                      {WRONG_SOUNDS.map(sound => (
                        <SelectItem key={sound} value={sound}>{sound}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-3 flex-1">
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
                    <span className="w-10 text-sm text-slate-500">{config.sounds.wrongVolume.toFixed(1)}</span>
                  </div>
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
                    <SelectTrigger className="w-44">
                      <SelectValue placeholder="选择正确提示音" />
                    </SelectTrigger>
                    <SelectContent>
                      {CORRECT_SOUNDS.map(sound => (
                        <SelectItem key={sound} value={sound}>{sound}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-3 flex-1">
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
                    <span className="w-10 text-sm text-slate-500">{config.sounds.correctVolume.toFixed(1)}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 gap-3 flex items-center">
                <div className="text-sm font-medium">按键提示音</div>
                <div className="flex items-center gap-3 flex-1">
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
                  <span className="w-10 text-sm text-slate-500">{config.sounds.typingVolume.toFixed(1)}</span>
                </div>
              </div>

              {config.learning.voiceId && (
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-medium whitespace-nowrap">发音人语速</div>
                    <input
                      type="range"
                      min="0.5"
                      max="2"
                      step="0.1"
                      value={config.learning.voiceSpeed ?? 1}
                      onChange={(event) => {
                        updateConfig({ learning: { voiceSpeed: Number(event.target.value) } })
                      }}
                      className="w-full"
                    />
                    <span className="w-10 text-sm text-slate-500">{(config.learning.voiceSpeed ?? 1).toFixed(1)}x</span>
                  </div>
                )}

              <div className="space-y-3">
                <div className="text-sm font-medium">发音人音效</div>

                {/* 默认发音 - 独占一行 */}
                <DefaultVoiceRow
                  selected={(config.learning.voiceId ?? 'default') === 'default'}
                  onSelect={() => updateConfig({ learning: { voiceId: 'default' as VoiceId } })}
                  playbackRate={config.learning.voiceSpeed ?? 1}
                />

                {/* 美音 - 一行两个 */}
                <div className="grid grid-cols-2 gap-3">
                  <VoiceCard
                    image="/images/tones/us_female.png"
                    title="美音-女声"
                    description="热情洋溢，音色清脆明亮，语速轻快活泼且富有极强的节奏感"
                    audioSrc="/tones/us_female.mp3"
                    selected={(config.learning.voiceId ?? 'default') === 'English_Upbeat_Woman'}
                    onSelect={() => updateConfig({ learning: { voiceId: 'English_Upbeat_Woman' as VoiceId } })}
                    playbackRate={config.learning.voiceSpeed ?? 1}
                    disabled={!isProUser}
                  />
                  <VoiceCard
                    image="/images/tones/us_male.png"
                    title="美音-男声"
                    description="声线低沉浑厚且富有磁性，说话节奏平稳有力、自信从容"
                    audioSrc="/tones/us_male.mp3"
                    selected={(config.learning.voiceId ?? 'default') === 'English_magnetic_voiced_man'}
                    onSelect={() => updateConfig({ learning: { voiceId: 'English_magnetic_voiced_man' as VoiceId } })}
                    playbackRate={config.learning.voiceSpeed ?? 1}
                    disabled={!isProUser}
                  />
                </div>

                {/* 英音 - 一行两个 */}
                <div className="grid grid-cols-2 gap-3">
                  <VoiceCard
                    image="/images/tones/uk_female.png"
                    title="英音-女声"
                    description="声线清脆明亮且极具穿透力，说话节奏抑扬顿挫、咬字清晰精准"
                    audioSrc="/tones/uk_female.mp3"
                    selected={(config.learning.voiceId ?? 'default') === 'English_compelling_lady1'}
                    onSelect={() => updateConfig({ learning: { voiceId: 'English_compelling_lady1' as VoiceId } })}
                    playbackRate={config.learning.voiceSpeed ?? 1}
                    disabled={!isProUser}
                  />
                  <VoiceCard
                    image="/images/tones/uk_male.png"
                    title="英音-男声"
                    description="声线清亮且富有张力，说话节奏抑扬顿挫、起伏明显"
                    audioSrc="/tones/uk_male.mp3"
                    selected={(config.learning.voiceId ?? 'default') === 'English_expressive_narrator'}
                    onSelect={() => updateConfig({ learning: { voiceId: 'English_expressive_narrator' as VoiceId } })}
                    playbackRate={config.learning.voiceSpeed ?? 1}
                    disabled={!isProUser}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6 mt-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">暗黑模式</div>
                  <div className="text-xs text-slate-500">开启暗黑主题</div>
                </div>
                <Switch
                  checked={theme === 'dark'}
                  onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">显示单词音标</div>
                  <div className="text-xs text-slate-500">仅影响单词拼写页面</div>
                </div>
                <Switch
                  checked={config.learning.showPhonetic}
                  onCheckedChange={(checked) => updateConfig({ learning: { showPhonetic: checked } })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">显示翻译</div>
                  <div className="text-xs text-slate-500">影响单词拼写与句子听写</div>
                </div>
                <Switch
                  checked={config.learning.showTranslation}
                  onCheckedChange={(checked) => updateConfig({ learning: { showTranslation: checked } })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">空格与回车键切换</div>
                  <div className="text-xs text-slate-500">
                    当前：空格键={config.learning.swapShortcutKeys ? '校验' : '朗读'}，回车键={config.learning.swapShortcutKeys ? '朗读' : '校验'}
                  </div>
                </div>
                <Switch
                  checked={config.learning.swapShortcutKeys ?? false}
                  onCheckedChange={(checked) => updateConfig({ learning: { swapShortcutKeys: checked } })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">课程中显示错题复习和生词复习</div>
                  <div className="text-xs text-slate-500">关闭后，单词和句子课程列表中，不显示错题复习和生词复习入口</div>
                </div>
                <Switch
                  checked={config.learning.showReviewEntries ?? false}
                  onCheckedChange={(checked) => updateConfig({ learning: { showReviewEntries: checked } })}
                />
              </div>

              <div className="space-y-3">
                <div>
                  <div className="text-sm font-medium">答题正确特效 <span className="text-xs text-slate-400 font-normal">（如遇卡顿，请选择&ldquo;无&rdquo;）</span></div>
                </div>
                <div className="flex items-center gap-4">
                  {EFFECT_OPTIONS.map(opt => (
                    <label key={opt.value} className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="correctEffectType"
                        value={opt.value}
                        checked={(config.learning.correctEffectType ?? 'realistic') === opt.value}
                        onChange={() => {
                          updateConfig({ learning: { correctEffectType: opt.value } })
                          if (opt.value !== 'none') {
                            playConfettiEffect(opt.value)
                          }
                        }}
                        className="accent-indigo-500 w-4 h-4"
                      />
                      <span className="text-lg">{opt.label}</span>
                    </label>
                  ))}
                </div>
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
