'use client'

import { useEffect, useState } from 'react'
// import { useRouter } from 'next/navigation'
import { Users } from 'lucide-react'
import Image from 'next/image'
import Empty from '@/components/common/Empty'

interface CatalogFirst { id: number; name: string; slug: string; seconds: CatalogSecond[] }
interface CatalogSecond { id: number; name: string; slug: string; thirds: CatalogThird[] }
interface CatalogThird { id: number; name: string; slug: string }
interface SentenceSetItem {
  id: number
  name: string
  slug: string
  description?: string
  isPro: boolean
  coverImage?: string
  ossDir: string
  _count: { sentences: number }
  learnersCount?: number
}

interface SentenceSetSelectorProps {
  onSelectSet: (slug: string) => void
}

export default function SentenceSetSelector({ onSelectSet }: SentenceSetSelectorProps) {
  // const router = useRouter()
  const [catalogs, setCatalogs] = useState<CatalogFirst[]>([])
  const [selectedFirstId, setSelectedFirstId] = useState<string>('ALL')
  const [selectedSecondId, setSelectedSecondId] = useState<string>('')
  const [selectedThirdId, setSelectedThirdId] = useState<string>('')
  const [sentenceSets, setSentenceSets] = useState<SentenceSetItem[]>([])

  // 加载目录树
  useEffect(() => {
    fetch('/api/catalog')
      .then(res => res.json())
      .then(data => {
        if (data.success) setCatalogs(data.data)
      })
      .catch(err => console.error('加载目录失败:', err))
  }, [])

  // 根据目录筛选加载句子集
  useEffect(() => {
    const params = new URLSearchParams()
    if (selectedFirstId && selectedFirstId !== 'ALL') params.set('catalogFirstId', selectedFirstId)
    if (selectedSecondId) params.set('catalogSecondId', selectedSecondId)
    if (selectedThirdId) params.set('catalogThirdId', selectedThirdId)

    fetch(`/api/sentence/sentence-set?${params.toString()}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) setSentenceSets(data.data)
      })
      .catch(err => console.error('加载句子集失败:', err))
  }, [selectedFirstId, selectedSecondId, selectedThirdId])

  return (
    <div className="mb-4">
      {/* 顶部级联筛选导航 */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="container mx-auto py-3">
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

      {/* 句子课程包列表 */}
      {sentenceSets.length > 0 ? (
        <div className="flex flex-wrap gap-4 mt-4">
          {sentenceSets.map((s) => (
            <div
              key={s.id}
              onClick={() => onSelectSet(s.slug)}
              className="w-[170px] justify-self-center bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-gray-200 dark:border-gray-700"
            >
              <div className="relative h-[240px] w-full bg-gradient-to-br from-blue-400 to-purple-500">
                {s.coverImage ? (
                  <Image
                    fill
                    sizes="170px"
                    src={(s.coverImage || '').trim()}
                    alt={s.name}
                    className="object-cover"
                  />
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
                  <p className="text-sm text-gray-500">{s._count.sentences} 句</p>
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
  )
}

