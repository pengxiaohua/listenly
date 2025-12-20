'use client'

import { useEffect, useState } from 'react'
// import { useRouter } from 'next/navigation'
import { Users } from 'lucide-react'
import Image from 'next/image'
import Empty from '@/components/common/Empty'
import { Progress } from '@/components/ui/progress'

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
  _count: { sentences: number, done: number }
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
              className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors cursor-pointer ${selectedFirstId === 'ALL'
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
                className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors cursor-pointer ${selectedFirstId === String(cat.id)
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
                className={`px-3 py-1.5 text-sm rounded-lg whitespace-nowrap transition-colors cursor-pointer ${!selectedSecondId ? 'bg-blue-400 text-white' : 'bg-gray-50 hover:bg-gray-100 text-gray-600'
                  }`}
              >
                全部
              </button>
              {(catalogs.find(c => c.id === parseInt(selectedFirstId))?.seconds || []).map(sec => (
                <button
                  key={sec.id}
                  onClick={() => { setSelectedSecondId(String(sec.id)); setSelectedThirdId('') }}
                  className={`px-3 py-1.5 text-sm rounded-lg whitespace-nowrap transition-colors cursor-pointer ${selectedSecondId === String(sec.id) ? 'bg-blue-400 text-white' : 'bg-gray-50 hover:bg-gray-100 text-gray-600'
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
                className={`px-3 py-1.5 text-sm rounded-lg whitespace-nowrap transition-colors cursor-pointer ${!selectedThirdId ? 'bg-blue-300 text-white' : 'bg-gray-50 hover:bg-gray-100 text-gray-600'
                  }`}
              >
                全部
              </button>
              {(((catalogs.find(c => c.id === parseInt(selectedFirstId))?.seconds) || []).find(s => s.id === parseInt(selectedSecondId))?.thirds || []).map(th => (
                <button
                  key={th.id}
                  onClick={() => setSelectedThirdId(String(th.id))}
                  className={`px-3 py-1.5 text-sm rounded-lg whitespace-nowrap transition-colors cursor-pointer ${selectedThirdId === String(th.id) ? 'bg-blue-300 text-white' : 'bg-gray-50 hover:bg-gray-100 text-gray-600'
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
        <div className="flex flex-wrap gap-4 md:gap-3 mt-4">
          {sentenceSets.map((s) => (
            <div
              key={s.id}
              onClick={() => onSelectSet(s.slug)}
              className="w-full sm:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.6666rem)] xl:w-[calc(25%-0.8333rem)] 2xl:p-4 p-3 bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm hover:shadow-md hover:bg-gray-100 dark:hover:bg-gray-600 transition-shadow cursor-pointer border border-gray-200 dark:border-gray-700 group"
            >
              <div className="flex h-full">
                {/* 课程封面 - 左侧 */}
                <div className="relative w-[105px] h-[148px] rounded-lg mr-3 3xl:mr-4 flex-shrink-0 bg-gradient-to-br from-blue-400 to-purple-500">
                  {s.coverImage ? (
                    <Image
                      fill
                      src={(s.coverImage || '').trim()}
                      alt={s.name}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white text-lg font-bold px-4">
                      {s.name}
                    </div>
                  )}
                </div>
                {/* 课程信息 - 右侧 */}
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-base mb-2 line-clamp-2">{s.name}</h3>
                    <div className='flex items-center gap-4 text-sm text-gray-500'>
                      <p>{s._count.sentences} 句</p>
                      <div className="flex items-center">
                        <Users className='w-4 h-4' />
                        <p className='ml-1'>{s.learnersCount ?? 0}人</p>
                      </div>
                    </div>
                    <div className='mt-2'>
                      {s.isPro ? (
                        <span className="text-xs bg-orange-600 text-white rounded-full px-3 py-1">
                          会员
                        </span>
                      ) : (
                        <span className="text-xs bg-green-600 text-white rounded-full px-3 py-1">
                          免费
                        </span>
                      )}
                    </div>
                  </div>
                  {/* 进度条 */}
                  <div>
                    <div className='text-xs text-gray-500'>进度：{s._count.done > 0 ? `${s._count.done}/${s._count.sentences}` : '未开始'}</div>
                    {s._count.done > 0 &&
                      <div className='mt-1'>
                        <Progress value={s._count.done / s._count.sentences * 100} className="w-full h-2" />
                      </div>
                    }
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

