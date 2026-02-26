'use client'

import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import dayjs from 'dayjs'

interface HourlyActivity {
  hour: number
  days: number
}

interface ActivityData {
  startDate: string
  endDate: string
  hourlyActivity: HourlyActivity[]
}

// 将小时（0-23）映射到弧线上的 progress（以06:00为起点）
function hourToProgress(hour: number): number {
  // 06:00 -> 0, 12:00 -> 0.25, 18:00 -> 0.5, 24:00 -> 0.75, 06:00 -> 1.0
  const shifted = hour >= 6 ? hour - 6 : hour + 18
  return shifted / 24
}

// 正弦波函数
function sineY(progress: number): number {
  return Math.sin(progress * 2 * Math.PI)
}

const LearningActivityPeriod: React.FC = () => {
  const [data, setData] = useState<ActivityData | null>(null)
  const [loading, setLoading] = useState(true)
  const [hoveredHour, setHoveredHour] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(800)

  // 响应式宽度
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(Math.max(containerRef.current.offsetWidth, 300))
      }
    }
    updateWidth()
    window.addEventListener('resize', updateWidth)
    return () => window.removeEventListener('resize', updateWidth)
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/user/activity-period')
        const result = await res.json()
        if (result.success) {
          setData(result.data)
        }
      } catch (err) {
        console.error('获取学习活动期数据失败:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // 尺寸参数
  const isMobile = containerWidth < 500
  const height = isMobile ? 180 : 230
  const padding = { left: 40, right: 40, top: 55, bottom: 45 }
  const chartWidth = containerWidth - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom
  const centerY = padding.top + chartHeight / 2
  const amplitude = chartHeight * 0.38

  // 根据 progress（0~1）计算 SVG 坐标
  const getPoint = useCallback((progress: number) => {
    const x = padding.left + progress * chartWidth
    const y = centerY - amplitude * sineY(progress)
    return { x, y }
  }, [chartWidth, centerY, amplitude, padding.left])

  // 生成平滑正弦曲线路径
  const curvePath = useMemo(() => {
    const points: string[] = []
    const steps = 200
    for (let i = 0; i <= steps; i++) {
      const progress = i / steps
      const { x, y } = getPoint(progress)
      points.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`)
    }
    return points.join(' ')
  }, [getPoint])

  // 时间标签
  const timeLabels = [
    { hour: 6, label: '06:00' },
    { hour: 12, label: '12:00' },
    { hour: 18, label: '18:00' },
    { hour: 24, label: '24:00' },
    { hour: 30, label: '06:00' },
  ]

  // 活动数据 Map
  const activityMap = useMemo(() => {
    const map = new Map<number, number>()
    if (data) {
      data.hourlyActivity.forEach(item => map.set(item.hour, item.days))
    }
    return map
  }, [data])

  // 最大天数
  const maxDays = data
    ? Math.max(...data.hourlyActivity.map(a => a.days), 1)
    : 1

  // 日期范围
  const dateRange = data
    ? `${dayjs(data.startDate).format('M月D日')} – ${dayjs(data.endDate).format('M月D日')}`
    : ''

  // 太阳图标（含光芒）
  const SunIcon = ({ x, y, size = 5 }: { x: number; y: number; size?: number }) => (
    <g transform={`translate(${x}, ${y})`}>
      <circle r={size} fill="#f59e0b" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map(angle => (
        <line
          key={angle}
          x1={Math.cos(angle * Math.PI / 180) * (size + 2)}
          y1={Math.sin(angle * Math.PI / 180) * (size + 2)}
          x2={Math.cos(angle * Math.PI / 180) * (size + 5)}
          y2={Math.sin(angle * Math.PI / 180) * (size + 5)}
          stroke="#f59e0b"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      ))}
    </g>
  )

  // 日出/日落图标
  const SunriseIcon = ({ x, y, rising = true }: { x: number; y: number; rising?: boolean }) => (
    <g transform={`translate(${x}, ${y})`}>
      <circle r="4.5" fill="#f59e0b" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map(angle => (
        <line
          key={angle}
          x1={Math.cos(angle * Math.PI / 180) * 6.5}
          y1={Math.sin(angle * Math.PI / 180) * 6.5}
          x2={Math.cos(angle * Math.PI / 180) * 9}
          y2={Math.sin(angle * Math.PI / 180) * 9}
          stroke="#f59e0b"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      ))}
      {/* 地平线 */}
      <line x1="-11" y1="2" x2="11" y2="2" stroke="#f59e0b" strokeWidth="0.8" strokeOpacity="0.5" />
      {/* 箭头 */}
      {rising ? (
        <polyline points="-2.5,-5 0,-8 2.5,-5" fill="none" stroke="#f59e0b" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <polyline points="-2.5,5 0,8 2.5,5" fill="none" stroke="#f59e0b" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </g>
  )

  // 月亮图标
  const MoonIcon = ({ x, y }: { x: number; y: number }) => (
    <g transform={`translate(${x}, ${y})`}>
      <path
        d="M-1,-5 C2,-5 5,-2 5,1 C5,4 2,7 -1,7 C-3,7 -5,6 -6,4 C-3,5 0,3 0,0 C0,-3 -3,-5 -6,-4 C-5,-5 -3,-5 -1,-5 Z"
        fill="#f59e0b"
      />
    </g>
  )

  if (loading) {
    return (
      <div className="p-4 bg-card rounded-xl border border-border">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/20">
            <svg className="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 7a5 5 0 100 10 5 5 0 000-10zm0-5a1 1 0 011 1v2a1 1 0 11-2 0V3a1 1 0 011-1zM5.64 5.64a1 1 0 011.41 0l1.42 1.42a1 1 0 01-1.42 1.41L5.64 7.05a1 1 0 010-1.41zM3 12a1 1 0 011-1h2a1 1 0 110 2H4a1 1 0 01-1-1zm2.64 6.36a1 1 0 010-1.41l1.42-1.42a1 1 0 111.41 1.42l-1.41 1.41a1 1 0 01-1.42 0zM12 19a1 1 0 011 1v2a1 1 0 11-2 0v-2a1 1 0 011-1zm6.36-2.64a1 1 0 010 1.41l-1.42 1.42a1 1 0 11-1.41-1.42l1.41-1.41a1 1 0 011.42 0zM20 11h2a1 1 0 110 2h-2a1 1 0 110-2zm-3.64-5.64a1 1 0 011.41 0l1.42 1.42a1 1 0 01-1.42 1.41l-1.41-1.41a1 1 0 010-1.42z"/>
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-foreground">学习活跃时段</h3>
        </div>
        <div className="h-[180px] flex items-center justify-center text-muted-foreground">
          加载中...
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 bg-card rounded-xl border border-border overflow-hidden">
      {/* 标题 */}
      <div className="flex items-center gap-2 mb-1">
        <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/20">
          <svg className="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 7a5 5 0 100 10 5 5 0 000-10zm0-5a1 1 0 011 1v2a1 1 0 11-2 0V3a1 1 0 011-1zM5.64 5.64a1 1 0 011.41 0l1.42 1.42a1 1 0 01-1.42 1.41L5.64 7.05a1 1 0 010-1.41zM3 12a1 1 0 011-1h2a1 1 0 110 2H4a1 1 0 01-1-1zm2.64 6.36a1 1 0 010-1.41l1.42-1.42a1 1 0 111.41 1.42l-1.41 1.41a1 1 0 01-1.42 0zM12 19a1 1 0 011 1v2a1 1 0 11-2 0v-2a1 1 0 011-1zm6.36-2.64a1 1 0 010 1.41l-1.42 1.42a1 1 0 11-1.41-1.42l1.41-1.41a1 1 0 011.42 0zM20 11h2a1 1 0 110 2h-2a1 1 0 110-2zm-3.64-5.64a1 1 0 011.41 0l1.42 1.42a1 1 0 01-1.42 1.41l-1.41-1.41a1 1 0 010-1.42z"/>
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-foreground">学习活跃时段</h3>
        <span className="text-sm text-muted-foreground">（近7天）</span>
      </div>

      {/* 图表 */}
      <div ref={containerRef} className="relative w-full">
        <svg
          width={containerWidth}
          height={height}
          viewBox={`0 0 ${containerWidth} ${height}`}
          className="w-full h-auto"
        >
          {/* 水平基线（虚线） */}
          <line
            x1={padding.left}
            y1={centerY}
            x2={padding.left + chartWidth}
            y2={centerY}
            stroke="currentColor"
            strokeOpacity="0.12"
            strokeDasharray="4 4"
          />

          {/* 垂直参考线（虚线） */}
          {timeLabels.map(({ hour }) => {
            const progress = (hour - 6) / 24
            const x = padding.left + progress * chartWidth
            return (
              <line
                key={`vline-${hour}`}
                x1={x}
                y1={padding.top - 5}
                x2={x}
                y2={height - padding.bottom + 5}
                stroke="currentColor"
                strokeOpacity="0.06"
                strokeDasharray="3 3"
              />
            )
          })}

          {/* 正弦曲线 */}
          <path
            d={curvePath}
            fill="none"
            stroke="currentColor"
            strokeOpacity="0.2"
            strokeWidth="1.5"
          />

          {/* 日出图标 (06:00 左侧) */}
          <SunriseIcon x={getPoint(0).x} y={getPoint(0).y} rising={true} />

          {/* 正午太阳 (12:00 顶部) */}
          <SunIcon x={getPoint(0.25).x} y={getPoint(0.25).y - 16} size={5.5} />

          {/* 日落图标 (18:00) */}
          <SunriseIcon x={getPoint(0.5).x} y={getPoint(0.5).y} rising={false} />

          {/* 月亮图标 (24:00 底部) */}
          <MoonIcon x={getPoint(0.75).x} y={getPoint(0.75).y + 18} />

          {/* 日出图标 (06:00 右侧) */}
          <SunriseIcon x={getPoint(1.0).x} y={getPoint(1.0).y} rising={true} />

          {/* 学习活动圆点 */}
          {data?.hourlyActivity.map(({ hour, days }) => {
            const progress = hourToProgress(hour)
            const { x, y } = getPoint(progress)
            const normalizedSize = days / maxDays
            const radius = 3 + normalizedSize * 5
            // 灰色深浅：数据量越大灰色越深，但整体更浅
            const grayValue = Math.round(220 - normalizedSize * 50) // 220(很浅灰) -> 170(稍深灰)
            const grayColor = `rgb(${grayValue}, ${grayValue}, ${grayValue})`
            // 透明度：数据量越大透明度越高（更明显）
            const opacity = 0.5 + normalizedSize * 0.4 // 0.5 -> 0.9
            const isHovered = hoveredHour === hour

            return (
              <g
                key={`dot-${hour}`}
                onMouseEnter={() => setHoveredHour(hour)}
                onMouseLeave={() => setHoveredHour(null)}
                className="cursor-pointer"
              >
                {/* 主圆点 */}
                <circle
                  cx={x}
                  cy={y}
                  r={isHovered ? radius + 1 : radius}
                  fill={grayColor}
                  fillOpacity={isHovered ? Math.min(opacity + 0.1, 0.95) : opacity}
                  className="transition-all duration-200"
                />
              </g>
            )
          })}

          {/* 时间刻度标签 */}
          {timeLabels.map(({ hour, label }) => {
            const progress = (hour - 6) / 24
            const x = padding.left + progress * chartWidth
            return (
              <text
                key={`label-${hour}`}
                x={x}
                y={height - padding.bottom + 28}
                textAnchor="middle"
                className="fill-muted-foreground"
                fontSize={isMobile ? '10' : '12'}
                fontFamily="ui-monospace, SFMono-Regular, 'SF Mono', Menlo, monospace"
                opacity="0.55"
              >
                {label}
              </text>
            )
          })}
        </svg>

        {/* Tooltip（基于圆点位置） */}
        {hoveredHour !== null && data && (() => {
          const progress = hourToProgress(hoveredHour)
          const { x, y } = getPoint(progress)
          // 将 SVG 坐标转换为百分比位置
          const leftPercent = (x / containerWidth) * 100
          const topPx = y

          return (
            <div
              className="absolute z-50 pointer-events-none"
              style={{
                left: `${leftPercent}%`,
                top: `${topPx - 16}px`,
                transform: 'translate(-50%, -100%)',
              }}
            >
              <div className="relative bg-popover text-popover-foreground border border-border rounded-lg shadow-xl px-3 py-2">
                <div className="text-muted-foreground text-xs mb-0.5">{dateRange}</div>
                <div className="font-semibold text-sm whitespace-nowrap">
                  在 {String(hoveredHour).padStart(2, '0')}:00 学习了 {activityMap.get(hoveredHour) || 0} 天
                </div>
                {/* 三角箭头 */}
                <div
                  className="absolute left-1/2 -translate-x-1/2 -bottom-[5px] w-2.5 h-2.5 bg-popover border-r border-b border-border rotate-45"
                />
              </div>
            </div>
          )
        })()}
      </div>

      {/* 无数据提示 */}
      {data && data.hourlyActivity.length === 0 && (
        <div className="text-center text-muted-foreground text-sm py-2">
          最近7天暂无学习记录
        </div>
      )}
    </div>
  )
}

export default LearningActivityPeriod
