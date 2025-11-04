// 时间格式化工具函数
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

export function formatTimeAgo(date: Date): string {
  const now = new Date()
  const diffInMs = now.getTime() - date.getTime()
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60))
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))
  const diffInMonths = Math.floor(diffInDays / 30)
  const diffInYears = Math.floor(diffInDays / 365)

  if (diffInMinutes < 1) {
    return '刚刚'
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes}分钟前`
  } else if (diffInHours < 24) {
    return `${diffInHours}小时前`
  } else if (diffInDays < 30) {
    return `${diffInDays}天前`
  } else if (diffInMonths < 12) {
    return `${diffInMonths}个月前`
  } else {
    return `${diffInYears}年前`
  }
}

// 获取用户本地时区的日期字符串
export function getLocalDateString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// 获取东八区（UTC+8）的日期字符串 YYYY-MM-DD
export function getBeijingDateString(date: Date = new Date()): string {
  // 将时间戳转换为东八区（UTC+8），加上 8 小时
  const beijingOffset = 8 * 60 * 60 * 1000
  const beijingTimestamp = date.getTime() + beijingOffset
  const beijingDate = new Date(beijingTimestamp)

  // 使用 UTC 方法获取东八区日期
  const year = beijingDate.getUTCFullYear()
  const month = String(beijingDate.getUTCMonth() + 1).padStart(2, '0')
  const day = String(beijingDate.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// 格式化最后学习时间
export function formatLastStudiedTime(timeStr: string | null): string {
  if (!timeStr) return '未开始'

  const date = dayjs(timeStr)
  const now = dayjs()
  const diffMins = now.diff(date, 'minute')
  const diffHours = now.diff(date, 'hour')
  const diffDays = now.diff(date, 'day')

  if (diffMins < 1) return '刚刚'
  if (diffMins < 60) return `${diffMins}分钟前`
  if (diffHours < 24) return `${diffHours}小时前`
  if (diffDays < 7) return `${diffDays}天前`

  // 超过7天显示具体日期
  return date.format('M月D日')
}
