'use client'

import { useState, useEffect, useRef } from 'react'
import { checkAuth, requireAuth } from '@/lib/auth'
import { authFetch } from '@/lib/fetch'

export default function DictationPage() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [userInput, setUserInput] = useState('')
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)
  const [lrcData, setLrcData] = useState<{ time: number, text: string }[]>([])

  useEffect(() => {
    const init = async () => {
      const isAuthenticated = await checkAuth()
      if (!isAuthenticated) {
        requireAuth()
      }
    }
    init()
  }, [])

  useEffect(() => {
    // Load saved progress
    const loadProgress = async () => {
      try {
        const res = await authFetch('/api/dictation/progress')
        const data = await res.json()
        if (data.position) {
          setCurrentIndex(data.position + 1)
        }
      } catch (error) {
        console.error('Failed to load progress:', error)
      }
    }
    loadProgress()
  }, [])

  useEffect(() => {
    // Load LRC file
    const loadLrc = async () => {
      const res = await fetch('/lrcs/2014-12-01.lrc')
      const text = await res.text()
      const lines = parseLrc(text)
      setLrcData(lines)

      setTimeout(() => playCurrentSentence(), 500)
    }
    loadLrc()
  }, [])

  const playCurrentSentence = () => {
    if (audioRef.current && lrcData[currentIndex]) {
      const currentTime = lrcData[currentIndex].time
      const nextTime = lrcData[currentIndex + 1]?.time || 999999

      audioRef.current.currentTime = currentTime
      audioRef.current?.play()
      setIsPlaying(true)

      setTimeout(() => {
        audioRef.current?.pause()
        setIsPlaying(false)
      }, (nextTime - currentTime) * 1000)
    }
  }

  useEffect(() => {
    playCurrentSentence()
  }, [currentIndex])

  const handleNext = async () => {
    try {
      await authFetch('/api/dictation/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          position: currentIndex,
          attempt: {
            sentence: lrcData[currentIndex].text,
            userInput,
            correct: userInput.trim().toLowerCase() === lrcData[currentIndex].text.trim().toLowerCase()
          }
        })
      })

      setCurrentIndex(prev => prev + 1)
      setUserInput('')
    } catch (error) {
      console.error('Failed to save progress:', error)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <audio ref={audioRef} src="/audio/2014-12-01.mp3" />

      {/* <div className="mb-4">
        <p>Current sentence:</p>
        <p className="text-lg font-bold">{lrcData[currentIndex]?.text}</p>
      </div> */}

      <div className="mb-4">
        <textarea
          value={userInput}
          onChange={e => setUserInput(e.target.value)}
          className="w-full p-2 border rounded"
          rows={3}
          placeholder="Type what you hear..."
        />
      </div>

      <div className="flex gap-4">
        <button
          onClick={playCurrentSentence}
          disabled={isPlaying}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          {isPlaying ? 'Playing...' : 'Play Again'}
        </button>

        <button
          onClick={handleNext}
          className="px-4 py-2 bg-green-500 text-white rounded"
        >
          Next
        </button>
      </div>
    </div>
  )
}

function parseLrc(lrc: string) {
  const lines = lrc.split('\n')
  const result = []

  for (const line of lines) {
    const match = line.match(/\[(\d+):(\d+\.\d+)\](.*)/)
    if (match) {
      const minutes = parseInt(match[1])
      const seconds = parseFloat(match[2])
      const text = match[3].trim()
      if (text) {
        result.push({
          time: minutes * 60 + seconds,
          text
        })
      }
    }
  }

  return result
}
