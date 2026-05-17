
'use client'

import { useRef, useState, useCallback } from 'react'
import Image from 'next/image'
import { Settings, MessageSquareText } from 'lucide-react'
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
import { useGlobalConfigStore } from '@/store/globalConfig'

const WRONG_SOUNDS = ['wrong.mp3', 'wrong02.mp3', 'wrong_0.5vol.mp3']
const CORRECT_SOUNDS = ['correct.mp3', 'correct02.mp3', 'correct03.mp3', 'correct04.mp3', 'correct_0.5vol.mp3']
const TYPING_SOUNDS = ['typing01.mp3', 'typing02.mp3']

function VoiceCard({ image, title, description, audioSrc, selected, onSelect, playbackRate, disabled, onPlayStart, currentPlaying }: {
  image: string
  title: string
  description: string
  audioSrc: string
  selected: boolean
  onSelect: () => void
  playbackRate: number
  disabled?: boolean
  onPlayStart: (title: string, audio: HTMLAudioElement) => void
  currentPlaying: string | null
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const playing = currentPlaying === title

  const handlePreview = useCallback(() => {
    if (playing && audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      onPlayStart('', null as unknown as HTMLAudioElement)
      return
    }
    const audio = new Audio(audioSrc)
    audio.playbackRate = playbackRate
    audioRef.current = audio
    audio.onended = () => onPlayStart('', null as unknown as HTMLAudioElement)
    audio.play().catch(() => onPlayStart('', null as unknown as HTMLAudioElement))
    onPlayStart(title, audio)
  }, [audioSrc, playing, playbackRate, title, onPlayStart])

  return (
    <div className={`rounded-lg border p-2.5 flex gap-3 ${
      selected ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-950/30' : 'border-slate-200 dark:border-slate-700'
    } ${disabled ? 'opacity-75' : ''}`}>
      <Image src={image} alt={title} width={48} height={48} className="rounded-full flex-shrink-0 w-12 h-12 object-cover" />
      <div className="flex flex-col gap-1.5 flex-1 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
          <span className="text-sm font-medium truncate">{title}</span>
          <div className="flex gap-1.5 shrink-0">
            {disabled ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" disabled className="px-1.5 sm:px-2.5 py-1 text-[10px] sm:text-xs rounded-full text-white bg-gray-400 cursor-not-allowed">
                    选择
                  </button>
                </TooltipTrigger>
                <TooltipContent>需要会员才能选择</TooltipContent>
              </Tooltip>
            ) : (
              <button type="button" onClick={onSelect} className={`px-1.5 sm:px-2.5 py-1 text-[10px] sm:text-xs rounded-full text-white cursor-pointer ${selected ? 'bg-indigo-600' : 'bg-gray-700 hover:bg-slate-800'}`}>
                {selected ? '已选' : '选择'}
              </button>
            )}
            <button type="button" onClick={handlePreview} className={`px-1.5 sm:px-2.5 py-1 text-[10px] sm:text-xs rounded-full text-white cursor-pointer ${playing ? 'bg-indigo-600' : 'bg-gray-700 hover:bg-slate-800'}`}>
              {playing ? '停止' : '试听'}
            </button>
          </div>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 hidden sm:block">{description}</p>
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
  const open = useGlobalConfigStore(state => state.open)
  const setOpen = useGlobalConfigStore(state => state.setOpen)
  const activeTab = useGlobalConfigStore(state => state.activeTab)
  const setActiveTab = useGlobalConfigStore(state => state.setActiveTab)
  const [feedbackOpen, setFeedbackOpen] = useState(false)

  const config = useUserConfigStore(state => state.config)
  const updateConfig = useUserConfigStore(state => state.updateConfig)
  const volumePreviewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { theme, setTheme } = useTheme()
  const userInfo = useAuthStore(state => state.userInfo)
  const isLogged = useAuthStore(state => state.isLogged)
  const isProUser = userInfo?.isPro ?? false
  const [voicePlaying, setVoicePlaying] = useState<string | null>(null)
  const currentVoiceAudioRef = useRef<HTMLAudioElement | null>(null)

  const handleVoicePlay = useCallback((title: string, audio: HTMLAudioElement | null) => {
    if (currentVoiceAudioRef.current && currentVoiceAudioRef.current !== audio) {
      currentVoiceAudioRef.current.pause()
      currentVoiceAudioRef.current.currentTime = 0
    }
    currentVoiceAudioRef.current = audio
    setVoicePlaying(title || null)
  }, [])

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

  return (
    <>
      {isLogged && (
        <div
          className="fixed z-50 right-0 top-1/2 -translate-y-1/2 flex flex-col gap-2"
          data-tour="global-config-float"
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="w-8 h-8 md:w-11 md:h-11 flex justify-center items-center rounded-l-full bg-white dark:bg-slate-800 border border-r-0 border-slate-200 dark:border-slate-700 shadow-md text-slate-600 dark:text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5 md:w-5 md:h-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left" sideOffset={6}>全局配置</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => setFeedbackOpen(true)}
                className="w-8 h-8 md:w-11 md:h-11 flex justify-center items-center rounded-l-full bg-white dark:bg-slate-800 border border-r-0 border-slate-200 dark:border-slate-700 shadow-md text-slate-600 dark:text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors cursor-pointer"
              >
                <MessageSquareText className="w-3.5 h-3.5 md:w-5 md:h-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left" sideOffset={6}>提个建议</TooltipContent>
          </Tooltip>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="md:max-w-3xl px-4 py-4 md:px-6 md:py-6">
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
            <div className="space-y-4 sm:space-y-5 mt-4">
              <div>
                <div className='flex flex-wrap sm:flex-nowrap items-center gap-3'>
                  <div className="text-sm font-medium shrink-0">错误提示音</div>
                  <Select
                    value={config.sounds.wrongSound}
                    onValueChange={(value) => {
                      updateConfig({ sounds: { wrongSound: value } })
                      playSoundPreview(value, config.sounds.wrongVolume)
                    }}
                  >
                    <SelectTrigger className="w-36 shrink-0">
                      <SelectValue placeholder="选择错误提示音" />
                    </SelectTrigger>
                    <SelectContent>
                      {WRONG_SOUNDS.map(sound => (
                        <SelectItem key={sound} value={sound}>{sound}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <input type="range" min="0" max="1" step="0.1" value={config.sounds.wrongVolume} onChange={(event) => { const v = Number(event.target.value); updateConfig({ sounds: { wrongVolume: v } }); playSoundPreviewDebounced(config.sounds.wrongSound, v) }} className="w-full" />
                    <span className="w-8 text-sm text-slate-500">{config.sounds.wrongVolume.toFixed(1)}</span>
                  </div>
                </div>
              </div>

              <div>
                <div className='flex flex-wrap sm:flex-nowrap items-center gap-3'>
                  <div className="text-sm font-medium shrink-0">正确提示音</div>
                  <Select
                    value={config.sounds.correctSound}
                    onValueChange={(value) => {
                      updateConfig({ sounds: { correctSound: value } })
                      playSoundPreview(value, config.sounds.correctVolume)
                    }}
                  >
                    <SelectTrigger className="w-36 shrink-0">
                      <SelectValue placeholder="选择正确提示音" />
                    </SelectTrigger>
                    <SelectContent>
                      {CORRECT_SOUNDS.map(sound => (
                        <SelectItem key={sound} value={sound}>{sound}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <input type="range" min="0" max="1" step="0.1" value={config.sounds.correctVolume} onChange={(event) => { const v = Number(event.target.value); updateConfig({ sounds: { correctVolume: v } }); playSoundPreviewDebounced(config.sounds.correctSound, v) }} className="w-full" />
                    <span className="w-8 text-sm text-slate-500">{config.sounds.correctVolume.toFixed(1)}</span>
                  </div>
                </div>
              </div>

              <div>
                <div className='flex flex-wrap sm:flex-nowrap items-center gap-3'>
                  <div className="text-sm font-medium shrink-0">按键提示音</div>
                  <Select
                    value={config.sounds.typingSound}
                    onValueChange={(value) => {
                      updateConfig({ sounds: { typingSound: value } })
                      playSoundPreview(value, config.sounds.typingVolume)
                    }}
                  >
                    <SelectTrigger className="w-36 shrink-0">
                      <SelectValue placeholder="选择按键提示音" />
                    </SelectTrigger>
                    <SelectContent>
                      {TYPING_SOUNDS.map(sound => (
                        <SelectItem key={sound} value={sound}>{sound}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={config.sounds.typingVolume}
                      onChange={(event) => {
                        const newVolume = Number(event.target.value)
                        updateConfig({ sounds: { typingVolume: newVolume } })
                        playSoundPreviewDebounced(config.sounds.typingSound, newVolume)
                      }}
                      className="w-full"
                    />
                    <span className="w-8 text-sm text-slate-500">{config.sounds.typingVolume.toFixed(1)}</span>
                  </div>
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

                {/* 美音 */}
                <div className="grid grid-cols-2 gap-2 md:gap-3">
                  <VoiceCard
                    image="/images/tones/us_female.png"
                    title="美音-女声"
                    description="热情洋溢，音色清脆明亮，语速轻快活泼且富有极强的节奏感"
                    audioSrc="/tones/us_female.mp3"
                    selected={(config.learning.voiceId ?? 'default') === 'English_Upbeat_Woman'}
                    onSelect={() => updateConfig({ learning: { voiceId: 'English_Upbeat_Woman' as VoiceId } })}
                    playbackRate={config.learning.voiceSpeed ?? 1}
                    disabled={!isProUser}
                    onPlayStart={handleVoicePlay}
                    currentPlaying={voicePlaying}
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
                    onPlayStart={handleVoicePlay}
                    currentPlaying={voicePlaying}
                  />
                </div>

                {/* 英音 */}
                <div className="grid grid-cols-2 gap-2 md:gap-3">
                  <VoiceCard
                    image="/images/tones/uk_female.png"
                    title="英音-女声"
                    description="声线清脆明亮且极具穿透力，说话节奏抑扬顿挫、咬字清晰精准"
                    audioSrc="/tones/uk_female.mp3"
                    selected={(config.learning.voiceId ?? 'default') === 'English_compelling_lady1'}
                    onSelect={() => updateConfig({ learning: { voiceId: 'English_compelling_lady1' as VoiceId } })}
                    playbackRate={config.learning.voiceSpeed ?? 1}
                    disabled={!isProUser}
                    onPlayStart={handleVoicePlay}
                    currentPlaying={voicePlaying}
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
                    onPlayStart={handleVoicePlay}
                    currentPlaying={voicePlaying}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 sm:space-y-6 mt-4">
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

              {/* 播报听写设置 */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">播报听写播放次数</div>
                  <div className="text-xs text-slate-500">每个单词连续播放的次数</div>
                </div>
                <Select
                  value={String(config.learning.dictationPlayCount ?? 2)}
                  onValueChange={(value) => updateConfig({ learning: { dictationPlayCount: Number(value) } })}
                >
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1次</SelectItem>
                    <SelectItem value="2">2次</SelectItem>
                    <SelectItem value="3">3次</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">播报听写间隔时长</div>
                    <div className="text-xs text-slate-500">单词播放完后等待的秒数</div>
                  </div>
                  <span className="text-sm text-slate-600 font-medium w-10 text-right">{config.learning.dictationInterval ?? 3}秒</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="1"
                  value={config.learning.dictationInterval ?? 3}
                  onChange={(e) => updateConfig({ learning: { dictationInterval: Number(e.target.value) } })}
                  className="w-full"
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
