'use client'

import { useEffect, useState, useCallback } from 'react'
import { LiquidTabs } from '@/components/ui/liquid-tabs'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'

const RANGE_TABS = [
  { value: '7', label: '近7天' },
  { value: '30', label: '近1个月' },
]

const COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444']

function ChartCard({ title, children, range, onRangeChange }: {
  title: string
  children: React.ReactNode
  range?: string
  onRangeChange?: (v: string) => void
}) {
  return (
    <div className="border rounded-lg p-4 mb-6 bg-white dark:bg-gray-900">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold">{title}</h3>
        {range && onRangeChange && (
          <LiquidTabs items={RANGE_TABS} value={range} onValueChange={onRangeChange} size="sm" id={`range-${title}`} />
        )}
      </div>
      {children}
    </div>
  )
}

function NewUsersChart() {
  const [range, setRange] = useState('7')
  const [data, setData] = useState<{ date: string; count: number }[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/analytics?type=newUsers&range=${range}`)
      const json = await res.json()
      setData(json.data ?? [])
    } finally {
      setLoading(false)
    }
  }, [range])

  useEffect(() => { load() }, [load])

  return (
    <ChartCard title="新用户" range={range} onRangeChange={setRange}>
      {loading ? <div className="text-center py-12 text-gray-400">加载中...</div> : (
        data.length === 0 ? <div className="text-center py-12 text-gray-400">暂无数据</div> : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="count" name="新用户数" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        )
      )}
    </ChartCard>
  )
}

function CityDistributionChart() {
  const [data, setData] = useState<{ city: string; count: number }[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/analytics?type=cityDistribution')
      const json = await res.json()
      setData(json.data ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <ChartCard title="用户城市分布（近1个月 Top 10）">
      {loading ? <div className="text-center py-12 text-gray-400">加载中...</div> : (
        data.length === 0 ? <div className="text-center py-12 text-gray-400">暂无数据</div> : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="city" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" name="用户数" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )
      )}
    </ChartCard>
  )
}

interface CourseItem { name: string; value: number }
interface CourseData { word: CourseItem[]; sentence: CourseItem[]; shadowing: CourseItem[] }

function buildGroupedBarData(data: CourseData) {
  const categories = [
    { key: 'word' as const, label: '单词' },
    { key: 'sentence' as const, label: '句子' },
    { key: 'shadowing' as const, label: '跟读' },
  ]
  // 收集所有课程名
  const allNames = new Set<string>()
  categories.forEach(c => data[c.key].forEach(item => allNames.add(item.name)))

  return categories.map(c => {
    const entry: Record<string, string | number> = { category: c.label }
    data[c.key].forEach((item, i) => {
      entry[`course${i + 1}`] = item.value
      entry[`name${i + 1}`] = item.name
    })
    return entry
  })
}

function CourseBarChart({ title, apiType, valueLabel }: {
  title: string
  apiType: string
  valueLabel: string
}) {
  const [range, setRange] = useState('7')
  const [data, setData] = useState<CourseData>({ word: [], sentence: [], shadowing: [] })
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/analytics?type=${apiType}&range=${range}`)
      const json = await res.json()
      setData({
        word: json.word ?? [],
        sentence: json.sentence ?? [],
        shadowing: json.shadowing ?? [],
      })
    } finally {
      setLoading(false)
    }
  }, [range, apiType])

  useEffect(() => { load() }, [load])

  const chartData = buildGroupedBarData(data)
  const hasData = data.word.length > 0 || data.sentence.length > 0 || data.shadowing.length > 0
  const maxCourses = Math.max(data.word.length, data.sentence.length, data.shadowing.length, 1)

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-white dark:bg-gray-800 border rounded-lg p-3 shadow-lg text-sm">
        <p className="font-semibold mb-1">{label}</p>
        {payload.map((p: any, i: number) => {
          const nameKey = `name${i + 1}`
          const entry = chartData.find(d => d.category === label)
          const courseName = entry?.[nameKey] ?? `课程${i + 1}`
          return (
            <p key={i} style={{ color: p.fill }}>
              {courseName}: {p.value} {valueLabel}
            </p>
          )
        })}
      </div>
    )
  }

  return (
    <ChartCard title={title} range={range} onRangeChange={setRange}>
      {loading ? <div className="text-center py-12 text-gray-400">加载中...</div> : (
        !hasData ? <div className="text-center py-12 text-gray-400">暂无数据</div> : (
          <>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={chartData} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" tick={{ fontSize: 13 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} label={{ value: valueLabel, angle: -90, position: 'insideLeft', style: { fontSize: 12 } }} />
                <Tooltip content={<CustomTooltip />} />
                {Array.from({ length: maxCourses }, (_, i) => (
                  <Bar key={i} dataKey={`course${i + 1}`} fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
            {/* 图例：显示各类别下的课程名 */}
            <div className="mt-4 grid grid-cols-3 gap-4 text-xs text-gray-500">
              {(['word', 'sentence', 'shadowing'] as const).map((key, ci) => (
                <div key={key}>
                  <p className="font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    {key === 'word' ? '单词' : key === 'sentence' ? '句子' : '跟读'}
                  </p>
                  {data[key].map((item, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: COLORS[i] }} />
                      <span className="truncate">{item.name}</span>
                      <span className="ml-auto text-gray-400">{item.value}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </>
        )
      )}
    </ChartCard>
  )
}

export default function DataAnalytics() {
  return (
    <div className="space-y-2">
      <NewUsersChart />
      <CityDistributionChart />
      <CourseBarChart title="用户喜好" apiType="preference" valueLabel="学习人数" />
      <CourseBarChart title="用户粘性" apiType="stickiness" valueLabel="学习时长(条)" />
    </div>
  )
}
