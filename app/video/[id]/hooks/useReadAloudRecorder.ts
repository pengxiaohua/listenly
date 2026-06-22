import { useCallback, useRef, useState } from 'react'

export type EvalWord = { text?: string; score?: number; phonetic?: string; type?: number }
export type EvalLine = { words?: EvalWord[]; pronunciation?: number; fluency?: number; integrity?: number }
export type EvalResult = { score?: number; lines?: EvalLine[] }

// 将录音 Blob 统一转码为 16kHz 单声道 16bit PCM WAV，满足第三方评测要求
async function transcodeToWav(chunks: Blob[], mimeType: string): Promise<File> {
  const inputBlob = new Blob(chunks, { type: mimeType })
  const arrayBuf = await inputBlob.arrayBuffer()
  const AudioCtxCtor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  const audioCtx = new AudioCtxCtor()
  const decoded = await audioCtx.decodeAudioData(arrayBuf)

  // 合成为单声道
  const length = decoded.length
  const chs = decoded.numberOfChannels
  const tmp = new Float32Array(length)
  for (let i = 0; i < chs; i++) {
    const data = decoded.getChannelData(i)
    for (let j = 0; j < length; j++) tmp[j] += data[j] / chs
  }
  const monoBuffer = audioCtx.createBuffer(1, length, decoded.sampleRate)
  monoBuffer.getChannelData(0).set(tmp)

  // 使用 OfflineAudioContext 重采样到 16000 Hz
  const targetRate = 16000
  const offlineCtor = window.OfflineAudioContext || (window as unknown as { webkitOfflineAudioContext: typeof OfflineAudioContext }).webkitOfflineAudioContext
  const offline = new offlineCtor(1, Math.ceil(monoBuffer.duration * targetRate), targetRate)
  const src = offline.createBufferSource()
  src.buffer = monoBuffer
  src.connect(offline.destination)
  src.start(0)
  const rendered: AudioBuffer = await offline.startRendering()

  // 写入 WAV（16-bit PCM, mono, 16kHz）
  const numOfChan = 1
  const outLength = rendered.length * numOfChan * 2 + 44
  const buffer = new ArrayBuffer(outLength)
  const view = new DataView(buffer)
  const channel = rendered.getChannelData(0)
  let offset = 0
  const writeString = (str: string, pos: number) => { for (let i = 0; i < str.length; i++) view.setUint8(pos + i, str.charCodeAt(i)) }
  writeString('RIFF', 0); view.setUint32(4, 36 + rendered.length * numOfChan * 2, true)
  writeString('WAVE', 8); writeString('fmt ', 12); view.setUint32(16, 16, true); view.setUint16(20, 1, true)
  view.setUint16(22, numOfChan, true); view.setUint32(24, targetRate, true)
  view.setUint32(28, targetRate * numOfChan * 2, true); view.setUint16(32, numOfChan * 2, true)
  view.setUint16(34, 16, true); writeString('data', 36); view.setUint32(40, rendered.length * numOfChan * 2, true)
  offset = 44
  for (let i = 0; i < rendered.length; i++) {
    let sample = channel[i]
    sample = Math.max(-1, Math.min(1, sample))
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true)
    offset += 2
  }

  const blob = new Blob([buffer], { type: 'audio/wav' })
  return new File([blob], 'record.wav', { type: 'audio/wav' })
}

/**
 * 视听演练「跟读」录音 + 评测 hook。
 * 每次仅维护一个进行中的录音，按句子索引归档结果。
 * 评测结果不落库（不调用 create-record），可重复跟读。
 */
export function useReadAloudRecorder() {
  const [recordingIdx, setRecordingIdx] = useState<number | null>(null)
  const [evaluatingIdx, setEvaluatingIdx] = useState<number | null>(null)
  const [results, setResults] = useState<Record<number, EvalResult>>({})
  const [recordedUrls, setRecordedUrls] = useState<Record<number, string>>({})
  const [micError, setMicError] = useState<string>('')
  const [countdown, setCountdown] = useState<number>(0)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const countdownIntervalRef = useRef<number | null>(null)
  const autoStopTimeoutRef = useRef<number | null>(null)

  const clearTimers = useCallback(() => {
    if (countdownIntervalRef.current) { window.clearInterval(countdownIntervalRef.current); countdownIntervalRef.current = null }
    if (autoStopTimeoutRef.current) { window.clearTimeout(autoStopTimeoutRef.current); autoStopTimeoutRef.current = null }
    setCountdown(0)
  }, [])

  const stop = useCallback(() => {
    try { mediaRecorderRef.current?.stop() } catch { /* ignore */ }
    setRecordingIdx(null)
    clearTimers()
  }, [clearTimers])

  /**
   * 开始录制指定句子。
   * @param idx 句子索引
   * @param text 句子英文文本
   * @param maxSeconds 最长录音时长（秒）
   */
  const start = useCallback(async (idx: number, text: string, maxSeconds = 12) => {
    setMicError('')
    if (!navigator.mediaDevices?.getUserMedia) {
      setMicError('当前浏览器不支持录音 API')
      return false
    }
    try {
      const navPerm = (navigator as unknown as { permissions?: { query: (arg: { name: 'microphone' }) => Promise<{ state: PermissionState }> } }).permissions
      const perm = navPerm ? await navPerm.query({ name: 'microphone' }) : null
      if (perm && perm.state === 'denied') {
        setMicError('浏览器已拦截麦克风。请在地址栏或系统设置中允许麦克风权限后重试。')
        return false
      }
    } catch { /* ignore */ }

    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
    } catch {
      setMicError('未获得麦克风权限。请允许网站使用麦克风后重试。')
      return false
    }
    streamRef.current = stream

    const candidates = ['audio/wav', 'audio/ogg;codecs=opus', 'audio/ogg', 'audio/webm;codecs=opus', 'audio/webm']
    let mimeType: string | undefined
    if (typeof MediaRecorder !== 'undefined' && typeof MediaRecorder.isTypeSupported === 'function') {
      mimeType = candidates.find(t => MediaRecorder.isTypeSupported(t))
    }
    if (!mimeType) {
      setMicError('当前浏览器不支持录音，请更换现代浏览器（建议 Chrome 或 Safari 17+）。')
      stream.getTracks().forEach(t => t.stop())
      return false
    }

    const mr = new MediaRecorder(stream, { mimeType })
    chunksRef.current = []
    mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
    mr.onstop = async () => {
      streamRef.current?.getTracks().forEach(t => t.stop())
      streamRef.current = null
      try {
        const file = await transcodeToWav(chunksRef.current, mimeType as string)
        const form = new FormData()
        form.append('audio', file)
        const uploadResp = await fetch('/api/shadowing/upload-audio', { method: 'POST', body: form })
        const upload = await uploadResp.json()
        if (upload?.url) setRecordedUrls(prev => ({ ...prev, [idx]: upload.url }))

        setEvaluatingIdx(idx)
        const fd = new FormData()
        fd.set('mode', 'E')
        fd.set('text', text)
        fd.set('voice', file)
        const evalResp = await fetch('/api/shadowing/evaluate?format=wav', { method: 'POST', body: fd })
        const evalJson = await evalResp.json()
        if (evalJson?.success && evalJson?.data) {
          const engine = evalJson.data?.EngineResult || evalJson.data
          setResults(prev => ({ ...prev, [idx]: engine }))
        } else {
          setMicError('评测失败，请重试')
        }
      } catch {
        setMicError('录音处理失败，请重试')
      } finally {
        setEvaluatingIdx(null)
      }
    }

    mediaRecorderRef.current = mr
    mr.start()
    setRecordingIdx(idx)

    const maxRecordSec = Math.max(6, Math.ceil(maxSeconds))
    setCountdown(maxRecordSec)
    countdownIntervalRef.current = window.setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          if (countdownIntervalRef.current) { window.clearInterval(countdownIntervalRef.current); countdownIntervalRef.current = null }
          return 0
        }
        return prev - 1
      })
    }, 1000)
    autoStopTimeoutRef.current = window.setTimeout(() => {
      try { mediaRecorderRef.current?.stop() } catch { /* ignore */ }
      setRecordingIdx(null)
      clearTimers()
    }, maxRecordSec * 1000)

    return true
  }, [clearTimers])

  return {
    recordingIdx,
    evaluatingIdx,
    results,
    recordedUrls,
    micError,
    countdown,
    start,
    stop,
    setMicError,
  }
}
