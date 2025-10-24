'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { Users } from 'lucide-react'

import AuthGuard from '@/components/auth/AuthGuard'
import Empty from '@/components/common/Empty'

interface CatalogFirst { id: number; name: string; slug: string; seconds: CatalogSecond[] }
interface CatalogSecond { id: number; name: string; slug: string; thirds: CatalogThird[] }
interface CatalogThird { id: number; name: string; slug: string }

interface ShadowingSetItem {
  id: number
  name: string
  slug: string
  description?: string
  isPro: boolean
  coverImage?: string
  ossDir: string
  _count: { shadowings: number }
  learnersCount?: number
}

export default function ShadowingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [catalogs, setCatalogs] = useState<CatalogFirst[]>([])
  const [selectedFirstId, setSelectedFirstId] = useState<string>('ALL')
  const [selectedSecondId, setSelectedSecondId] = useState<string>('')
  const [selectedThirdId, setSelectedThirdId] = useState<string>('')
  const [shadowingSets, setShadowingSets] = useState<ShadowingSetItem[]>([])
  const [selectedSetId, setSelectedSetId] = useState<string>('')
  const [current, setCurrent] = useState<{ id: number; text: string; translation?: string } | null>(null)
  const [setMeta, setSetMeta] = useState<{ name: string; ossDir: string } | null>(null)
  const [audioUrl, setAudioUrl] = useState('')
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const [recording, setRecording] = useState(false)
  const chunksRef = useRef<Blob[]>([])
  const [evaluating, setEvaluating] = useState(false)
  type EvalWord = { text?: string; score?: number; phonetic?: string }
  type EvalLine = { words?: EvalWord[]; pronunciation?: number; fluency?: number; integrity?: number }
  type EvalResult = { score?: number; lines?: EvalLine[] }
  const [evalResult, setEvalResult] = useState<EvalResult | null>(null)
  const [micError, setMicError] = useState<string>('')

  // 加载目录树
  useEffect(() => {
    fetch('/api/catalog')
      .then(res => res.json())
      .then(data => {
        if (data.success) setCatalogs(data.data)
      })
      .catch(err => console.error('加载目录失败:', err))
  }, [])

  // 根据目录筛选加载跟读集
  useEffect(() => {
    const params = new URLSearchParams()
    if (selectedFirstId && selectedFirstId !== 'ALL') params.set('catalogFirstId', selectedFirstId)
    if (selectedSecondId) params.set('catalogSecondId', selectedSecondId)
    if (selectedThirdId) params.set('catalogThirdId', selectedThirdId)

    fetch(`/api/shadowing/shadowing-set?${params.toString()}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) setShadowingSets(data.data)
      })
      .catch(err => console.error('加载跟读集失败:', err))
  }, [selectedFirstId, selectedSecondId, selectedThirdId])

  // 当选择跟读集时，跳转到练习（后续练习页实现）
  useEffect(() => {
    if (selectedSetId) {
      const selected = shadowingSets.find(s => s.id === parseInt(selectedSetId))
      if (selected) {
        router.push(`/shadowing?set=${selected.slug}`)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSetId])

  // 加载当前句子（进入练习）
  useEffect(() => {
    const slug = searchParams.get('set')
    if (!slug) return
    fetch(`/api/shadowing/get?shadowingSet=${encodeURIComponent(slug)}`)
      .then(res => res.json())
      .then(async data => {
        if (data?.completed) {
          setCurrent(null)
          return
        }
        setCurrent({ id: data.id, text: data.text, translation: data.translation })
        setSetMeta({ name: data.shadowingSet.name, ossDir: data.shadowingSet.ossDir })

        // 若无翻译，调用句子翻译接口并写回 Shadowing（服务端目前写回 Sentence；此处仅获取翻译展示）
        if (!data.translation && data.text && data.id) {
          try {
            const resp = await fetch('/api/sentence/translate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text: data.text, sentenceId: data.id })
            })
            const tr = await resp.json()
            if (tr.success && tr.translation) {
              setCurrent(prev => prev ? { ...prev, translation: tr.translation } : prev)
            }
          } catch {}
        }
      })
      .catch(err => console.error('加载跟读内容失败:', err))
  }, [searchParams])

  // 获取音频并自动播放
  useEffect(() => {
    const slug = searchParams.get('set')
    if (!current?.text || !setMeta?.ossDir || !slug) return
    fetch(`/api/sentence/mp3-url?sentence=${encodeURIComponent(current.text)}&dir=${setMeta.ossDir}`)
      .then(res => res.json())
      .then(mp3 => setAudioUrl(mp3.url))
      .catch(err => console.error('获取MP3失败:', err))
  }, [current, setMeta, searchParams])

  useEffect(() => {
    if (!audioUrl || !audioRef.current) return
    const audio = audioRef.current
    audio.src = audioUrl
    audio.load()
    const handleCanPlayThrough = () => {
      audio.play().catch(() => {})
    }
    audio.addEventListener('canplaythrough', handleCanPlayThrough)
    return () => audio.removeEventListener('canplaythrough', handleCanPlayThrough)
  }, [audioUrl])

  return (
    <AuthGuard>
      <div className="container mx-auto p-4">
        {!searchParams.get('set') && (
          <div className="mb-4">
            {/* 顶部级联筛选导航，与句子页一致 */}
            <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
              <div className="container mx-auto px-4 py-3">
                {/* 一级目录 */}
                <div className="flex gap-2 mb-2 overflow-x-auto">
                  <button
                    onClick={() => { setSelectedFirstId('ALL'); setSelectedSecondId(''); setSelectedThirdId('') }}
                    className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                      selectedFirstId === 'ALL'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                    }`}
                  >
                    全部
                  </button>
                  {catalogs.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => { setSelectedFirstId(String(cat.id)); setSelectedSecondId(''); setSelectedThirdId('') }}
                      className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                        selectedFirstId === String(cat.id)
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>

                {/* 二级目录 */}
                {selectedFirstId && (catalogs.find(c => c.id === parseInt(selectedFirstId))?.seconds?.length || 0) > 0 && (
                  <div className="flex gap-2 mb-2 overflow-x-auto">
                    <button
                      onClick={() => { setSelectedSecondId(''); setSelectedThirdId('') }}
                      className={`px-3 py-1.5 text-sm rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                        !selectedSecondId ? 'bg-blue-400 text-white' : 'bg-gray-50 hover:bg-gray-100 text-gray-600'
                      }`}
                    >
                      全部
                    </button>
                    {(catalogs.find(c => c.id === parseInt(selectedFirstId))?.seconds || []).map(sec => (
                      <button
                        key={sec.id}
                        onClick={() => { setSelectedSecondId(String(sec.id)); setSelectedThirdId('') }}
                        className={`px-3 py-1.5 text-sm rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                          selectedSecondId === String(sec.id) ? 'bg-blue-400 text-white' : 'bg-gray-50 hover:bg-gray-100 text-gray-600'
                        }`}
                      >
                        {sec.name}
                      </button>
                    ))}
                  </div>
                )}

                {/* 三级目录 */}
                {selectedSecondId && ((catalogs.find(c => c.id === parseInt(selectedFirstId))?.seconds || []).find(s => s.id === parseInt(selectedSecondId))?.thirds?.length || 0) > 0 && (
                  <div className="flex gap-2 overflow-x-auto">
                    <button
                      onClick={() => setSelectedThirdId('')}
                      className={`px-3 py-1.5 text-sm rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                        !selectedThirdId ? 'bg-blue-300 text-white' : 'bg-gray-50 hover:bg-gray-100 text-gray-600'
                      }`}
                    >
                      全部
                    </button>
                    {(((catalogs.find(c => c.id === parseInt(selectedFirstId))?.seconds) || []).find(s => s.id === parseInt(selectedSecondId))?.thirds || []).map(th => (
                      <button
                        key={th.id}
                        onClick={() => setSelectedThirdId(String(th.id))}
                        className={`px-3 py-1.5 text-sm rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                          selectedThirdId === String(th.id) ? 'bg-blue-300 text-white' : 'bg-gray-50 hover:bg-gray-100 text-gray-600'
                        }`}
                      >
                        {th.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 跟读课程包列表 */}
            {shadowingSets.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 mt-4">
                {shadowingSets.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => setSelectedSetId(String(s.id))}
                    className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-gray-200 dark:border-gray-700"
                  >
                    <div className="relative h-[240px] bg-gradient-to-br from-blue-400 to-purple-500">
                      {s.coverImage ? (
                        <Image width={180} height={100} src={(s.coverImage || '').trim()} alt={s.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white text-2xl font-bold px-6">
                          {s.name}
                        </div>
                      )}
                      {s.isPro && (
                        <span className="absolute top-2 right-2 bg-black text-white text-xs px-2 py-1 rounded">会员专享</span>
                      )}
                    </div>
                    <div className="px-2 py-1 w-full bg-white opacity-75 dark:bg-gray-800">
                      <h3 className="font-bold text-sm line-clamp-1 mb-1">{s.name}</h3>
                      <div className='flex justify-between items-center'>
                        <p className="text-sm text-gray-500">{s._count.shadowings} 条</p>
                        <div className="text-sm flex items-center text-gray-500">
                          <Users className='w-4 h-4' />
                          <p className='ml-1'>{s.learnersCount ?? 0}人</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 text-gray-400">
                <Empty text="暂无课程包" />
              </div>
            )}
          </div>
        )}

        {/* 练习区域：当 URL 携带 set 且已加载当前句子时显示 */}
        {searchParams.get('set') && (
          <div className='mt-8'>
            <div className="mb-4 flex items-center gap-4">
              {/* <span>当前跟读集：<b>{setMeta?.name || ''}</b></span> */}
              <button
                onClick={() => {
                  router.push('/shadowing');
                  setCurrent(null);
                  setSetMeta(null);
                  setAudioUrl('');
                  setSelectedSetId('');
                }}
                className="px-2 py-1 bg-gray-200 rounded-lg cursor-pointer hover:bg-gray-300"
              >← 返回</button>
              <button
                onClick={() => {
                  if (!audioRef.current) return
                  audioRef.current.play().catch(() => {})
                }}
                className="px-2 py-1 bg-gray-100 rounded-lg cursor-pointer hover:bg-gray-200"
              >再次朗读</button>
              <audio ref={audioRef} preload="auto" style={{ display: 'none' }} />
            </div>

            <div className="text-2xl md:text-3xl font-medium mb-2">
              {current?.text || '加载中...'}
            </div>
            <div className="text-gray-600">
              {current?.translation || '翻译加载中...'}
            </div>

            {/* 录音与评测 */}
            <div className="mt-6 flex items-center gap-3">
              <button
                disabled={!current || recording}
                onClick={async () => {
                  setMicError('')
                  if (!navigator.mediaDevices?.getUserMedia) {
                    setMicError('当前浏览器不支持录音 API')
                    return
                  }
                  try {
                    // 预检测麦克风权限
                    const navPerm = (navigator as unknown as { permissions?: { query: (arg: { name: 'microphone' }) => Promise<{ state: PermissionState }> } }).permissions
                    const perm = navPerm ? await navPerm.query({ name: 'microphone' }) : null
                    if (perm && perm.state === 'denied') {
                      setMicError('浏览器已拦截麦克风。请点击地址栏相机/麦克风图标允许，或在系统设置中开启麦克风权限后重试。')
                      return
                    }
                  } catch { /* ignore */ }

                  let stream: MediaStream
                  try {
                    stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
                  } catch {
                    setMicError('未获得麦克风权限。请允许网站使用麦克风后重试。')
                    return
                  }
                  // 选择第三方支持的容器，优先 WAV，其次 OGG；若不支持则回退 WebM(稍后转 WAV)
                  const candidates = ['audio/wav', 'audio/ogg;codecs=opus', 'audio/ogg', 'audio/webm;codecs=opus', 'audio/webm']
                  let mimeType: string | undefined
                  if (typeof MediaRecorder !== 'undefined' && typeof MediaRecorder.isTypeSupported === 'function') {
                    mimeType = candidates.find(t => MediaRecorder.isTypeSupported(t))
                  }
                  // 如果 API 不支持能力判断或都不支持（连 webm 也不支持），直接提示
                  if (!mimeType) {
                    alert('当前浏览器不支持 WAV/OGG 录音，请更换现代浏览器（建议 Chrome 或 Safari 17+）。')
                    return
                  }
                  const mr = new MediaRecorder(stream, { mimeType })
                  chunksRef.current = []
                  mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
                  mr.onstop = async () => {
                    // 将录音统一转码为 16kHz 单声道 16bit PCM WAV，以满足第三方要求
                    const inputBlob = new Blob(chunksRef.current, { type: mimeType })
                    const arrayBuf = await inputBlob.arrayBuffer()
                    const AudioCtxCtor = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)
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
                    const offlineCtor = (window.OfflineAudioContext || (window as unknown as { webkitOfflineAudioContext: typeof OfflineAudioContext }).webkitOfflineAudioContext)
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
                    const ext = 'wav'
                    const file = new File([blob], `record.${ext}`, { type: 'audio/wav' })
                    const form = new FormData()
                    form.append('audio', file)
                    const uploadResp = await fetch('/api/shadowing/upload-audio', { method: 'POST', body: form })
                    const upload = await uploadResp.json()
                    if (!upload?.success) return

                    // 评测（直连代理：前端可视化所有入参/出参）
                    setEvaluating(true)
                    try {
                      const fd = new FormData()
                      fd.set('mode', 'E')
                      fd.set('text', current?.text || '')
                      // 这里直接传外链便于快速定位，如需文件可改为再次下载并 set('voice',file)
                      // 直接以文件方式传给第三方，更符合文档要求
                      const download = await fetch(upload.url)
                      const arr = await download.arrayBuffer()
                      const recBlob = new Blob([arr], { type: 'audio/wav' })
                      const recFile = new File([recBlob], 'audio.wav', { type: 'audio/wav' })
                      fd.set('voice', recFile)
                      // 走正式后端 evaluate，保持当前前端 FormData 方式
                      const evalResp = await fetch(`/api/shadowing/evaluate?format=wav`, { method: 'POST', body: fd })
                      const evalJson = await evalResp.json()
                      if (evalJson?.success && evalJson?.data) {
                        const engine = evalJson.data?.EngineResult || evalJson.data
                        setEvalResult(engine)
                      }
                    } finally {
                      setEvaluating(false)
                    }
                  }
                  mediaRecorderRef.current = mr
                  mr.start()
                  setRecording(true)
                }}
                className="px-3 py-1 bg-blue-600 text-white rounded disabled:opacity-50"
              >跟读</button>

              <button
                disabled={!recording}
                onClick={() => { mediaRecorderRef.current?.stop(); setRecording(false) }}
                className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
              >结束</button>

              {evaluating && <span className="text-sm text-gray-500">评测中...</span>}
              {micError && <span className="text-sm text-red-600">{micError}</span>}
            </div>

            {/* 评测结果展示（PC 风格） */}
            {evalResult && (
              <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* 总览卡片 */}
                <div className="col-span-1 p-5 rounded-xl border bg-white dark:bg-gray-900">
                  <div className="text-5xl font-extrabold">{typeof evalResult.score === 'number' ? Math.round(evalResult.score) : '--'}</div>
                  <div className="text-gray-500 mt-1">总分</div>
                  <div className="mt-4 grid grid-cols-3 text-center">
                    <div>
                      <div className="text-2xl font-semibold">{(evalResult?.lines?.[0] as EvalLine | undefined)?.pronunciation ?? '--'}</div>
                      <div className="text-xs text-gray-500">准确</div>
                    </div>
                    <div>
                      <div className="text-2xl font-semibold">{(evalResult?.lines?.[0] as EvalLine | undefined)?.fluency ?? '--'}</div>
                      <div className="text-xs text-gray-500">流利</div>
                    </div>
                    <div>
                      <div className="text-2xl font-semibold">{(evalResult?.lines?.[0] as EvalLine | undefined)?.integrity ?? '--'}</div>
                      <div className="text-xs text-gray-500">完整</div>
                    </div>
                  </div>
                </div>

                {/* 句子整体表现（按词着色） */}
                <div className="col-span-2 p-5 rounded-xl border bg-white dark:bg-gray-900">
                  <div className="font-semibold mb-3">句子整体表现</div>
                  <div className="text-xl leading-10">
                    {(evalResult?.lines?.[0]?.words as EvalWord[] | undefined)?.map((w, idx: number) => {
                      const sc = Number(w.score ?? 0)
                      const color = sc >= 85 ? 'text-green-600' : sc >= 60 ? 'text-yellow-600' : 'text-red-600'
                      return <span key={idx} className={`${color} mr-1`}>{w.text}</span>
                    })}
                  </div>
                  <div className="mt-2 text-xs text-gray-500 flex items-center gap-4">
                    <span className="inline-flex items-center"><span className="w-3 h-3 bg-green-600 inline-block mr-1"></span>很好</span>
                    <span className="inline-flex items-center"><span className="w-3 h-3 bg-yellow-600 inline-block mr-1"></span>还行</span>
                    <span className="inline-flex items-center"><span className="w-3 h-3 bg-red-600 inline-block mr-1"></span>错误</span>
                  </div>
                </div>

                {/* 单词明细表 */}
                <div className="col-span-3 p-5 rounded-xl border bg-white dark:bg-gray-900">
                  <div className="font-semibold mb-3">句子单词表现</div>
                  <div className="overflow-x-auto">
                    <table className="min-w-[600px] w-full text-sm">
                      <thead>
                        <tr className="text-left text-gray-600">
                          <th className="py-2 pr-4">单词</th>
                          <th className="py-2 pr-4">音标</th>
                          <th className="py-2 pr-4">分数</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(evalResult?.lines?.[0]?.words as EvalWord[] | undefined)?.map((w, idx: number) => (
                          <tr key={idx} className="border-t">
                            <td className="py-2 pr-4">{w.text}</td>
                            <td className="py-2 pr-4">{w.phonetic || '-'}</td>
                            <td className="py-2 pr-4">{w.score ?? '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AuthGuard>
  )
}
