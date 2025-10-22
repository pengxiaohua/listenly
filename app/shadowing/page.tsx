'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'

interface ShadowingSetOption {
  id: number
  name: string
  slug: string
  isPro: boolean
}

export default function ShadowingPage() {
  const router = useRouter()
  const [sets, setSets] = useState<ShadowingSetOption[]>([])
  const [selectedSet, setSelectedSet] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadSets = async () => {
      try {
        const res = await fetch('/api/shadowing/shadowing-set')
        const result = await res.json()
        if (result.success) {
          const list = (result.data as Array<{ id: number; name: string; slug: string; isPro: boolean }>)
            .map(s => ({ id: s.id, name: s.name, slug: s.slug, isPro: s.isPro }))
          setSets(list)
        }
      } catch {
        // noop
      } finally {
        setLoading(false)
      }
    }
    loadSets()
  }, [])

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold">影子跟读</h1>
        <p className="text-sm text-muted-foreground mt-1">选择一个跟读集开始练习</p>
      </div>

      <div className="max-w-xl">
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">选择跟读集</label>
          <Select value={selectedSet} onValueChange={setSelectedSet}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={loading ? '加载中...' : '请选择跟读集'} />
            </SelectTrigger>
            <SelectContent>
              {sets.map(s => (
                <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border p-4 flex gap-2 justify-end">
          <Button disabled={!selectedSet} onClick={() => router.push(`/shadowing?set=${selectedSet}`)}>
            开始练习
          </Button>
        </div>
      </div>
    </div>
  )
}
