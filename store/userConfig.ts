import { create } from 'zustand'
import type { ConfettiEffectType } from '@/lib/confettiEffects'

export type VoiceId = 'default' | 'English_expressive_narrator' | 'English_compelling_lady1' | 'English_magnetic_voiced_man' | 'English_Upbeat_Woman'

export const VOICE_OPTIONS: { value: VoiceId; label: string; suffix: string }[] = [
  { value: 'default', label: '默认发音', suffix: '' },
  { value: 'English_expressive_narrator', label: '英音男', suffix: '_male_uk' },
  { value: 'English_compelling_lady1', label: '英音女', suffix: '_female_uk' },
  { value: 'English_magnetic_voiced_man', label: '美音男', suffix: '_male_us' },
  { value: 'English_Upbeat_Woman', label: '美音女', suffix: '_female_us' },
]

export type UserConfig = {
  sounds: {
    wrongSound: string
    wrongVolume: number
    correctSound: string
    correctVolume: number
    typingVolume: number
  }
  learning: {
    showPhonetic: boolean
    showTranslation: boolean
    /** 调换空格键与回车键功能：默认空格=朗读、回车=校验；开启后空格=校验、回车=朗读 */
    swapShortcutKeys: boolean
    /** 答题正确特效类型，'none' 表示关闭 */
    correctEffectType: ConfettiEffectType
    /** 发音人音效 voice_id */
    voiceId: VoiceId
    /** 发音人语速 0.5~2 */
    voiceSpeed: number
  }
}

export const DEFAULT_CONFIG: UserConfig = {
  sounds: {
    wrongSound: 'wrong_0.5vol.mp3',
    wrongVolume: 0.5,
    correctSound: 'correct_0.5vol.mp3',
    correctVolume: 0.5,
    typingVolume: 0.5
  },
  learning: {
    showPhonetic: false,
    showTranslation: true,
    swapShortcutKeys: false,
    correctEffectType: 'realistic',
    voiceId: 'default',
    voiceSpeed: 1
  }
}

type DeepPartial<T> = T extends object
  ? {
      [P in keyof T]?: T[P] extends (infer U)[]
        ? U[]
        : T[P] extends readonly (infer U)[]
        ? readonly U[]
        : DeepPartial<T[P]>
    }
  : T

const mergeConfig = (base: UserConfig, incoming: DeepPartial<UserConfig>): UserConfig => ({
  sounds: {
    ...base.sounds,
    ...(incoming.sounds ?? {})
  },
  learning: {
    ...base.learning,
    ...(incoming.learning ?? {})
  }
})

let saveTimer: ReturnType<typeof setTimeout> | null = null

const saveConfig = async (config: UserConfig) => {
  await fetch('/api/user/config', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ config })
  })
}

type UserConfigState = {
  config: UserConfig
  isLoaded: boolean
  isSaving: boolean
  fetchConfig: () => Promise<void>
  updateConfig: (partial: DeepPartial<UserConfig>) => void
  resetConfig: () => void
}

export const useUserConfigStore = create<UserConfigState>((set, get) => ({
  config: DEFAULT_CONFIG,
  isLoaded: false,
  isSaving: false,
  fetchConfig: async () => {
    try {
      const res = await fetch('/api/user/config')
      if (!res.ok) {
        set({ isLoaded: true })
        return
      }
      const data = await res.json()
      const merged = data?.config
        ? mergeConfig(DEFAULT_CONFIG, data.config as Partial<UserConfig>)
        : DEFAULT_CONFIG
      set({ config: merged, isLoaded: true })
    } catch (error) {
      console.error('获取用户配置失败:', error)
      set({ isLoaded: true })
    }
  },
  updateConfig: (partial) => {
    const nextConfig = mergeConfig(get().config, partial)
    set({ config: nextConfig, isSaving: true })
    if (saveTimer) {
      clearTimeout(saveTimer)
    }
    saveTimer = setTimeout(async () => {
      try {
        await saveConfig(nextConfig)
      } catch (error) {
        console.error('保存用户配置失败:', error)
      } finally {
        set({ isSaving: false })
      }
    }, 300)
  },
  resetConfig: () => {
    set({ config: DEFAULT_CONFIG })
  }
}))
