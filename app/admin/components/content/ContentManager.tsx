'use client'

import { useState } from 'react'
import { LiquidTabs } from '@/components/ui/liquid-tabs'
import WordSetManager from '../word/WordSetManager'
import SentenceSetManager from '../sentence/SentenceSetManager'
import ShadowingSetManager from '../shadowing/ShadowingSetManager'

const TABS = [
  { value: 'word', label: '单词内容' },
  { value: 'sentence', label: '句子内容' },
  { value: 'shadowing', label: '跟读内容' },
]

export default function ContentManager() {
  const [tab, setTab] = useState('word')

  return (
    <div className="p-3">
      <LiquidTabs items={TABS} value={tab} onValueChange={setTab} id="content-manager" className="mb-6" />
      {tab === 'word' && <WordSetManager />}
      {tab === 'sentence' && <SentenceSetManager />}
      {tab === 'shadowing' && <ShadowingSetManager />}
    </div>
  )
}
