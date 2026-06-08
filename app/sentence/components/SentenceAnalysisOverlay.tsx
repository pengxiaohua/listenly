'use client'

import { useEffect, useState, useRef } from 'react'

interface WordAnalysis {
  word: string
  phonetic: string
  pos: string
  posZh: string
  role: string
}

interface AnalysisGroup {
  words: WordAnalysis[]
  role: string
}

interface SentenceAnalysisOverlayProps {
  sentence: string
  sentenceId?: number
  translation?: string
  onNext: () => void
}

type RoleStyle = { bg: string; border: string; label: string }

const ROLE_STYLES: Record<string, RoleStyle> = {
  '主语': { bg: 'bg-rose-50', border: 'border-rose-300', label: 'text-rose-600 bg-rose-100' },
  '谓语': { bg: 'bg-blue-50', border: 'border-blue-300', label: 'text-blue-600 bg-blue-100' },
  '宾语': { bg: 'bg-violet-50', border: 'border-violet-300', label: 'text-violet-600 bg-violet-100' },
  '表语': { bg: 'bg-purple-50', border: 'border-purple-300', label: 'text-purple-600 bg-purple-100' },
  '定语': { bg: 'bg-amber-50', border: 'border-amber-300', label: 'text-amber-600 bg-amber-100' },
  '状语': { bg: 'bg-emerald-50', border: 'border-emerald-300', label: 'text-emerald-600 bg-emerald-100' },
  '补语': { bg: 'bg-cyan-50', border: 'border-cyan-300', label: 'text-cyan-600 bg-cyan-100' },
  '介词': { bg: 'bg-lime-50', border: 'border-lime-300', label: 'text-lime-600 bg-lime-100' },
  '称呼': { bg: 'bg-orange-50', border: 'border-orange-300', label: 'text-orange-600 bg-orange-100' },
  '否定': { bg: 'bg-red-50', border: 'border-red-300', label: 'text-red-600 bg-red-100' },
  '感叹': { bg: 'bg-pink-50', border: 'border-pink-300', label: 'text-pink-600 bg-pink-100' },
  '助动': { bg: 'bg-sky-50', border: 'border-sky-300', label: 'text-sky-600 bg-sky-100' },
  '小品': { bg: 'bg-slate-50', border: 'border-slate-300', label: 'text-slate-600 bg-slate-100' },
  '同位': { bg: 'bg-teal-50', border: 'border-teal-300', label: 'text-teal-600 bg-teal-100' },
  '连词': { bg: 'bg-indigo-50', border: 'border-indigo-300', label: 'text-indigo-600 bg-indigo-100' },
  '限定': { bg: 'bg-amber-50', border: 'border-amber-300', label: 'text-amber-600 bg-amber-100' },
  '标点': { bg: 'bg-gray-50', border: 'border-gray-200', label: 'text-gray-400 bg-gray-100' },
  '标记': { bg: 'bg-sky-50', border: 'border-sky-300', label: 'text-sky-600 bg-sky-100' },
}

const DEFAULT_STYLE: RoleStyle = { bg: 'bg-gray-50', border: 'border-gray-200', label: 'text-gray-500 bg-gray-100' }

// 模糊匹配优先级（按顺序）：先匹配更具体的关键词
const ROLE_MATCH_ORDER = [
  '主语', '谓语', '宾语', '表语', '定语', '状语', '补语',
  '介词', '称呼', '否定', '感叹', '助动', '小品', '同位',
  '连词', '限定', '标点', '标记',
]

function getRoleStyle(role: string): RoleStyle {
  if (!role) return DEFAULT_STYLE
  if (ROLE_STYLES[role]) return ROLE_STYLES[role]
  for (const key of ROLE_MATCH_ORDER) {
    if (role.includes(key)) return ROLE_STYLES[key]
  }
  return DEFAULT_STYLE
}

export default function SentenceAnalysisOverlay({
  sentence,
  sentenceId,
  translation,
  onNext,
}: SentenceAnalysisOverlayProps) {
  const [groups, setGroups] = useState<AnalysisGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [revealed, setRevealed] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    fetch('/api/sentence/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: sentence, sentenceId }),
    })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then(data => {
        if (cancelled) return
        if (data.success && data.groups?.length) {
          setGroups(data.groups)
          setLoading(false)
        } else {
          onNext()
        }
      })
      .catch(() => {
        if (!cancelled) onNext()
      })

    return () => { cancelled = true }
  }, [sentence, sentenceId, onNext])

  useEffect(() => {
    if (!loading) {
      const id = requestAnimationFrame(() => setRevealed(true))
      return () => cancelAnimationFrame(id)
    }
    setRevealed(false)
  }, [loading])

  // 只有加载完成后才监听键盘事件，并加入 500ms 延迟防止与验证最后一个单词的回车键冲突
  useEffect(() => {
    if (loading) return

    let active = true
    const timerId = window.setTimeout(() => {
      if (!active) return
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onNext()
        }
      }
      window.addEventListener('keydown', handleKeyDown)
      cleanupRef.current = () => window.removeEventListener('keydown', handleKeyDown)
    }, 500)

    const cleanupRef = { current: () => {} }

    return () => {
      active = false
      window.clearTimeout(timerId)
      cleanupRef.current()
    }
  }, [loading, onNext])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-3">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-500" />
        <span className="text-sm text-slate-500">正在分析句子结构...</span>
      </div>
    )
  }

  if (groups.length === 0) {
    return null
  }

  return (
    <div
      ref={containerRef}
      className="flex flex-col items-center gap-3 md:gap-6 transition-all duration-500 ease-out"
      style={{
        opacity: revealed ? 1 : 0,
        transform: revealed ? 'translateY(0)' : 'translateY(16px)',
      }}
    >
      {/* 句式结构分析卡片 */}
      <div className="bg-white rounded-xl md:rounded-2xl shadow-lg border border-slate-100 px-3 py-3 md:px-6 md:py-5 w-fit max-w-[90vw]">
        <div className="flex flex-wrap items-end justify-center gap-1 md:gap-1.5 mb-2 md:mb-4">
          {groups.map((group, gIdx) => {
            const style = getRoleStyle(group.role)
            return (
              <div key={gIdx} className="flex flex-col items-center gap-0.5 md:gap-1">
                {/* 音标行 */}
                <div className="flex items-center gap-0.5 md:gap-1">
                  {group.words.map((w, wIdx) => (
                    <span key={wIdx} className="text-[10px] md:text-xs text-slate-400 font-mono">
                      {w.phonetic || '\u00A0'}
                    </span>
                  ))}
                </div>

                {/* 词性标签 */}
                <div className="flex items-center gap-0.5 md:gap-1">
                  {group.words.map((w, wIdx) => (
                    <span
                      key={wIdx}
                      className={`text-[8px] md:text-[10px] px-1 md:px-1.5 py-px md:py-0.5 rounded-full font-medium ${style.label}`}
                    >
                      {w.posZh || w.pos}
                    </span>
                  ))}
                </div>

                {/* 单词 + 背景 */}
                <div
                  className={`flex items-center gap-0.5 md:gap-1 px-1.5 py-1 md:px-2 md:py-2 rounded-md md:rounded-lg border md:border-2 ${style.bg} ${style.border}`}
                >
                  {group.words.map((w, wIdx) => (
                    <span key={wIdx} className="text-sm md:text-2xl font-semibold text-slate-800">
                      {w.word}
                    </span>
                  ))}
                </div>

                {/* 语法角色下划线标签 */}
                <span className={`text-[10px] md:text-xs font-medium mt-px md:mt-0.5 ${group.role ? 'text-slate-500' : 'text-transparent select-none'}`}>
                  {group.role || '\u00A0'}
                </span>
              </div>
            )
          })}
        </div>

        {/* 翻译 */}
        {translation && (
          <p className="text-center text-xs md:text-base text-slate-500 mt-1 md:mt-2">{translation}</p>
        )}
      </div>

      {/* 继续按钮 */}
      {/* <button
        onClick={onNext}
        className="px-4 py-1.5 md:px-6 md:py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium text-xs md:text-sm transition-colors cursor-pointer shadow-sm"
      >
        下一句 →
      </button> */}

      <p className="text-sm md:text-base text-gray-800 border border-indigo-500 rounded-full px-4 py-2">
        按 <b className="font-bold text-indigo-600">空格</b> 或 <b className="font-bold text-indigo-600">回车</b> 继续
      </p>
    </div>
  )
}
