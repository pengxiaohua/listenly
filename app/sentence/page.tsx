'use client'

import { useEffect, useState, useRef } from 'react'
import { Volume2 } from 'lucide-react'

import AuthGuard from '@/components/auth/AuthGuard'

export default function SentencePage() {
  const [corpora, setCorpora] = useState<{ id: number, name: string, description?: string, ossDir: string }[]>([])
  const [corpusId, setCorpusId] = useState<number | null>(null)
  const [corpusOssDir, setCorpusOssDir] = useState<string>('')
  const [corpusName, setCorpusName] = useState<string>('')
  const [sentence, setSentence] = useState<{ id: number, text: string } | null>(null)
  const [sentenceIndex, setSentenceIndex] = useState(0)
  const [userInput, setUserInput] = useState<string[]>([])
  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  const [audioUrl, setAudioUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [totalSentences, setTotalSentences] = useState<number>(0)
  const [wordStatus, setWordStatus] = useState<('correct' | 'wrong' | 'pending')[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)
  // 预留分类筛选变量
  // const [category, setCategory] = useState<string>('全部')

  // 自动聚焦到当前单词输入框
  useEffect(() => {
    if (sentence) {
      const inputs = document.querySelectorAll('input[type="text"]')
      if (inputs[currentWordIndex]) {
        (inputs[currentWordIndex] as HTMLInputElement).focus()
      }
    }
  }, [currentWordIndex, sentence])

  // 获取语料库列表
  useEffect(() => {
    fetch('/api/sentence/corpus')
      .then(res => res.json())
      .then(data => {
        setCorpora(data)
      })
  }, [])

  // 选择语料库后，获取进度和总句数
  useEffect(() => {
    if (!corpusId) return
    const corpus = corpora.find(c => c.id === corpusId)
    setCorpusName(corpus?.name || '')
    setCorpusOssDir(corpus?.ossDir || '')
    fetch(`/api/sentence/progress?corpusId=${corpusId}`)
      .then(res => res.json())
      .then(data => {
        setSentenceIndex(data.sentenceIndex || 0)
      })
    // 获取总句数
    fetch(`/api/sentence/admin?corpusId=${corpusId}&page=1&pageSize=1`)
      .then(res => res.json())
      .then(data => {
        setTotalSentences(data.pagination.total)
      })
  }, [corpusId])

  // 获取当前句子
  useEffect(() => {
    if (corpusId === null) return
    setLoading(true)
    fetch(`/api/sentence/get?corpusId=${corpusId}&sentenceIndex=${sentenceIndex}`)
      .then(res => res.json())
      .then(data => {
        setSentence(data)
        setUserInput(Array(data.text.split(' ').length).fill(''))
        setWordStatus(Array(data.text.split(' ').length).fill('pending'))
        setCurrentWordIndex(0)
        setLoading(false)
        // 获取音频
        fetch(`/api/sentence/mp3-url?sentence=${encodeURIComponent(data.text)}&dir=${corpusOssDir}`)
          .then(res => res.json())
          .then(mp3 => {
            setAudioUrl(mp3.url)
            // 确保音频加载完成后自动播放
            if (audioRef.current) {
              audioRef.current.load() // 重新加载音频
              audioRef.current.oncanplaythrough = () => {
                audioRef.current?.play()
              }
            }
          })
      })
  }, [corpusId, sentenceIndex, corpusOssDir])

  // 播放打字音效
  const playTypingSound = () => {
    const audio = new Audio('/sounds/typing.mp3')
    audio.play()
  }

  // 播放正确音效
  const playCorrectSound = () => {
    const audio = new Audio('/sounds/correct.mp3')
    audio.play()
  }

  // 播放错误音效
  const playWrongSound = () => {
    const audio = new Audio('/sounds/wrong.mp3')
    audio.play()
  }

  // 处理输入
  const handleInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!sentence) return
    const words = sentence.text.split(' ')
    const currentWord = words[currentWordIndex]

    // 清理单词中的标点符号
    const cleanWord = (word: string) => {
      return word.replace(/[.,!?:;()]/g, '').toLowerCase()
    }

    if (e.key === 'Enter') {
      // 提交整个句子
      const isCorrect = userInput.join(' ').toLowerCase() === sentence.text.toLowerCase()
      handleSubmit(isCorrect)
    } else if (e.key === ' ') {
      e.preventDefault() // 阻止空格键的默认行为
      // 空格键切换到下一个单词
      const currentInput = userInput[currentWordIndex] || ''

      // 检查输入长度（忽略标点符号）
      const cleanCurrentInput = cleanWord(currentInput)
      const cleanTargetWord = cleanWord(currentWord)

      if (cleanCurrentInput.length === cleanTargetWord.length) {
        // 输入完整，进行校验
        if (cleanCurrentInput === cleanTargetWord) {
          setWordStatus(prev => {
            const next = [...prev]
            next[currentWordIndex] = 'correct'
            return next
          })
          playCorrectSound() // 播放正确音效
          // 正确时跳转到下一个单词
          if (currentWordIndex < words.length - 1) {
            setCurrentWordIndex(prev => prev + 1)
          } else {
            // 如果是最后一个单词，自动提交整个句子
            handleSubmit(true)
          }
        } else {
          setWordStatus(prev => {
            const next = [...prev]
            next[currentWordIndex] = 'wrong'
            return next
          })
          playWrongSound() // 播放错误音效
          // 错误时停留在当前输入框，不清空输入内容，允许用户修改
        }
      } else {
        // 输入不完整，标记为错误并停留在当前输入框
        setWordStatus(prev => {
          const next = [...prev]
          next[currentWordIndex] = 'wrong'
          return next
        })
        playWrongSound() // 播放错误音效
        // 输入不完整时也停留在当前输入框
      }
    } else if (e.key === 'Backspace') {
      // 处理退格键
      const newInput = [...userInput]
      newInput[currentWordIndex] = newInput[currentWordIndex].slice(0, -1)
      setUserInput(newInput)
    } else if (e.key.length === 1) {
      // 普通字符输入
      const newInput = [...userInput]
      newInput[currentWordIndex] = (newInput[currentWordIndex] || '') + e.key
      setUserInput(newInput)
      playTypingSound()
    }
  }

  // 提交答题
  const handleSubmit = async (isCorrect: boolean) => {
    if (!sentence) return
    await fetch('/api/sentence/attempt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sentenceId: sentence.id,
        userInput: userInput.join(' '),
        correct: isCorrect
      })
    })
    await fetch('/api/sentence/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        corpusId,
        sentenceIndex: sentenceIndex + 1
      })
    })
    setSentenceIndex(idx => idx + 1)
  }

  // 切换语料库
  function handleCorpusChange(id: number) {
    setCorpusId(id)
    setSentenceIndex(0)
    setSentence(null)
    setUserInput([])
    setAudioUrl('')
    setTotalSentences(0)
  }

  // 返回语料库选择
  function handleBackToCorpusList() {
    setCorpusId(null)
    setCorpusOssDir('')
    setSentenceIndex(0)
    setSentence(null)
    setUserInput([])
    setAudioUrl('')
    setTotalSentences(0)
  }

  // 分类筛选UI预留
  // const categories = ['全部', '日常口语', '考试', ...]

  return (
    <AuthGuard>
    <div className="max-w-5xl mx-auto p-4">
      {/* 分类筛选UI预留 */}
      {/* <div className="mb-4">
        <label>分类：</label>
        <select value={category} onChange={e => setCategory(e.target.value)}>
          {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
        </select>
      </div> */}
      {!corpusId ? (
        <div className="mb-4">
          <h2 className="text-2xl font-bold mb-4">选择语料库：</h2>
          <div className="flex flex-wrap gap-2">
            {corpora.map(c => (
              <div
                key={c.id}
                onClick={() => handleCorpusChange(c.id)}
                className="w-[30%] p-5 bg-gray-200 rounded-lg cursor-pointer hover:bg-gray-300"
              >
                <div className="text-center text-xl mb-3">{c.name}</div>
                <div className="text-sm text-gray-500">{c.description}</div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="mb-4 flex items-center gap-4">
          <span>当前语料库：<b>{corpusName}</b></span>
          <button onClick={handleBackToCorpusList} className="px-2 py-1 bg-gray-200 rounded-lg cursor-pointer hover:bg-gray-300">返回语料库选择</button>
        </div>
      )}
      {corpusId && (
        <div className='flex flex-col items-center'>
          <div className="mb-2 text-gray-600">{totalSentences > 0 ? `第 ${sentenceIndex + 1} / ${totalSentences} 句` : ''}</div>
          {loading ? <div>加载中...</div> : (
            <>
              <div className="flex items-center gap-2 mb-4">
                <button
                  onClick={() => audioRef.current?.play()}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <Volume2 className="w-6 h-6 cursor-pointer" />
                </button>
                {audioUrl && <audio ref={audioRef} src={audioUrl} />}
              </div>
              <div className="flex flex-wrap gap-2 text-2xl mt-8 mb-4">
                {sentence?.text.split(' ').map((word, i) => {
                  // 计算输入框宽度，考虑标点符号的额外空间
                  const minWidth = 2 // 最小宽度为2个字符
                  const paddingWidth = 1 // 额外的padding宽度
                  const width = Math.max(minWidth, word.length + paddingWidth)

                  return (
                    <div key={i} className="relative">
                      <input
                        type="text"
                        value={userInput[i] || ''}
                        onChange={() => { }}
                        onKeyDown={handleInput}
                        className={`border-b-2 text-center focus:outline-none ${wordStatus[i] === 'correct' ? 'border-green-500 text-green-500' :
                          wordStatus[i] === 'wrong' ? 'border-red-500 text-red-500' :
                            'border-gray-300'
                          }`}
                        style={{
                          width: `${width}ch`,
                          minWidth: `${width}ch`,
                          padding: '0 0.5ch'
                        }}
                        disabled={i !== currentWordIndex}
                        autoFocus={i === currentWordIndex}
                      />
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
    </AuthGuard>
  )
}
