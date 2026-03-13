import { VOICE_OPTIONS, type VoiceId } from '@/store/userConfig'

/**
 * 根据 voiceId 获取对应的后缀
 */
export function getVoiceSuffix(voiceId: VoiceId | string): string {
  const opt = VOICE_OPTIONS.find(o => o.value === voiceId)
  return opt?.suffix || ''
}

/**
 * 根据 voiceId 获取对应的数据库字段名
 */
export function getVoiceOssKeyField(voiceId: VoiceId | string): string | null {
  const map: Record<string, string> = {
    English_expressive_narrator: 'ossKeyMaleUk',
    English_compelling_lady1: 'ossKeyFemaleUk',
    English_magnetic_voiced_man: 'ossKeyMaleUs',
    English_Upbeat_Woman: 'ossKeyFemaleUs',
  }
  return map[voiceId] || null
}

interface FetchTtsAudioParams {
  text: string
  voiceId: VoiceId | string
  type: 'word' | 'sentence' | 'shadowing'
  targetId: string | number
  ossDir: string
}

/**
 * 调用 TTS 生成接口，返回音频 URL
 */
export async function fetchTtsAudio(params: FetchTtsAudioParams): Promise<string> {
  const res = await fetch('/api/tts/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || 'TTS 生成失败')
  }

  const data = await res.json()
  return data.url || ''
}
