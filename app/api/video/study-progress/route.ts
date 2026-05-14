import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  VIDEO_HEARTBEAT_MAX_SECONDS,
  VIDEO_RECORD_MERGE_WINDOW_MS,
} from '@/lib/constants'

/**
 * 视听演练学习时长心跳上报
 * Body: { videoId: number, playedSeconds: number, activeSeconds: number }
 *
 * 写入策略：同 (userId, videoId) 最近一条 VideoRecord 的 updatedAt 距今 <
 * VIDEO_RECORD_MERGE_WINDOW_MS 时累加到该行，否则新建一行。
 *
 * 注：单次心跳的 playedSeconds + activeSeconds 不应超过 VIDEO_HEARTBEAT_MAX_SECONDS，
 * 超出部分会被截断，避免异常上报刷时长。
 */
export async function POST(req: NextRequest) {
  // 直接从 cookie 读取 userId：/api/video 路径不在 middleware 的 authRoutes 中
  // （视频列表/详情对游客开放），所以这里自行做登录校验。
  const userId = req.cookies.get('userId')?.value
  if (!userId) {
    return NextResponse.json({ success: false, error: '未登录' }, { status: 401 })
  }

  let body: { videoId?: unknown; playedSeconds?: unknown; activeSeconds?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: '请求体解析失败' }, { status: 400 })
  }

  const videoId = Number(body.videoId)
  let playedSeconds = Math.max(0, Math.floor(Number(body.playedSeconds) || 0))
  let activeSeconds = Math.max(0, Math.floor(Number(body.activeSeconds) || 0))

  if (!Number.isInteger(videoId) || videoId <= 0) {
    return NextResponse.json({ success: false, error: '参数错误' }, { status: 400 })
  }

  // 全 0 心跳无意义，直接返回成功
  if (playedSeconds === 0 && activeSeconds === 0) {
    return NextResponse.json({ success: true })
  }

  // 单次心跳总时长封顶
  const total = playedSeconds + activeSeconds
  if (total > VIDEO_HEARTBEAT_MAX_SECONDS) {
    const ratio = VIDEO_HEARTBEAT_MAX_SECONDS / total
    playedSeconds = Math.floor(playedSeconds * ratio)
    activeSeconds = Math.floor(activeSeconds * ratio)
  }

  try {
    // 视频必须存在（避免脏数据）
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      select: { id: true },
    })
    if (!video) {
      return NextResponse.json({ success: false, error: '视频不存在' }, { status: 404 })
    }

    const mergeThreshold = new Date(Date.now() - VIDEO_RECORD_MERGE_WINDOW_MS)
    const recent = await prisma.videoRecord.findFirst({
      where: { userId, videoId, updatedAt: { gte: mergeThreshold } },
      orderBy: { updatedAt: 'desc' },
      select: { id: true },
    })

    if (recent) {
      await prisma.videoRecord.update({
        where: { id: recent.id },
        data: {
          playedSeconds: { increment: playedSeconds },
          activeSeconds: { increment: activeSeconds },
        },
      })
    } else {
      await prisma.videoRecord.create({
        data: { userId, videoId, playedSeconds, activeSeconds },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('视频学习时长上报失败:', error)
    return NextResponse.json({ success: false, error: '上报失败' }, { status: 500 })
  }
}
