/**
 * 全局常量
 */

/// 每日打卡所需的最小学习时长（分钟）
export const CHECKIN_MIN_MINUTES = 20

/// 视听演练相关
/// 活跃停留时长权重（页面可见 + 焦点 + 近 60s 有交互时的折算系数）
export const VIDEO_ACTIVE_WEIGHT = 0.5
/// 客户端心跳间隔（毫秒）
export const VIDEO_HEARTBEAT_INTERVAL_MS = 30 * 1000
/// 服务端单次心跳允许的最大上报秒数（30s 间隔 + 5s 容错）
export const VIDEO_HEARTBEAT_MAX_SECONDS = 35
/// 同一 (userId, videoId) 距上次更新小于该阈值时累加到同一行
export const VIDEO_RECORD_MERGE_WINDOW_MS = 120 * 1000
/// 客户端"近 N 秒有交互即视为活跃"的窗口（毫秒）
export const VIDEO_ACTIVE_IDLE_TIMEOUT_MS = 60 * 1000
/// 视频学习数门槛：单视频累计有效时长（秒）≥ 该值才计入"视频学习数"
export const VIDEO_COUNT_THRESHOLD_SECONDS = 30
