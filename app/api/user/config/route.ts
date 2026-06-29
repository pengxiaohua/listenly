import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { isPro } from '@/lib/membership'

// 非默认发音 voiceId 列表（需要会员）
const PRO_VOICE_IDS = ['English_expressive_narrator', 'English_compelling_lady1', 'English_magnetic_voiced_man', 'English_Upbeat_Woman']
const MEMBER_DEFAULT_VOICE_ID = 'English_Upbeat_Woman'

export const dynamic = 'force-dynamic'

type UserConfig = {
  sounds: {
    wrongSound: string
    wrongVolume: number
    correctSound: string
    correctVolume: number
    typingVolume: number
  }
  learning: {
    showPhonetic: boolean
    showTranslation: boolean
    swapShortcutKeys?: boolean
    correctEffectType?: string
    voiceId?: string
    voiceSpeed?: number
    showReviewEntries?: boolean
    dictationPlayCount?: number
    dictationInterval?: number
  }
}

const DEFAULT_CONFIG: UserConfig = {
  sounds: {
    wrongSound: 'wrong_0.5vol.mp3',
    wrongVolume: 0.5,
    correctSound: 'correct_0.5vol.mp3',
    correctVolume: 0.5,
    typingVolume: 0.5
  },
  learning: {
    showPhonetic: false,
    showTranslation: true,
    swapShortcutKeys: false,
    correctEffectType: 'realistic',
    voiceId: 'default',
    voiceSpeed: 1,
    showReviewEntries: false,
    dictationPlayCount: 2,
    dictationInterval: 3
  }
}

const mergeConfig = (base: UserConfig, incoming: Partial<UserConfig>): UserConfig => ({
  sounds: {
    ...base.sounds,
    ...(incoming.sounds ?? {})
  },
  learning: {
    ...base.learning,
    ...(incoming.learning ?? {})
  }
})

function normalizeVoiceForMembership(config: UserConfig, userIsPro: boolean): UserConfig {
  const voiceId = config.learning.voiceId || 'default'

  if (userIsPro && voiceId === 'default') {
    return {
      ...config,
      learning: {
        ...config.learning,
        voiceId: MEMBER_DEFAULT_VOICE_ID,
      },
    }
  }

  if (!userIsPro && PRO_VOICE_IDS.includes(voiceId)) {
    return {
      ...config,
      learning: {
        ...config.learning,
        voiceId: 'default',
      },
    }
  }

  return config
}

export async function GET() {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('userId')?.value

    if (!userId) {
      return new NextResponse(null, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { config: true, membershipExpiresAt: true }
    })

    if (!user) {
      return new NextResponse(null, { status: 404 })
    }

    const rawConfig = user.config
      ? mergeConfig(DEFAULT_CONFIG, user.config as Partial<UserConfig>)
      : DEFAULT_CONFIG
    const userIsPro = isPro(user.membershipExpiresAt)
    const config = normalizeVoiceForMembership(rawConfig, userIsPro)

    if ((rawConfig.learning.voiceId || 'default') !== (config.learning.voiceId || 'default')) {
      const currentConfig = (user.config as Record<string, unknown>) || {}
      await prisma.user.update({
        where: { id: userId },
        data: {
          config: {
            ...currentConfig,
            ...config,
          } as unknown as Record<string, string | number | boolean | null>,
        },
      })
    }

    return NextResponse.json({ success: true, config })
  } catch (error) {
    console.error('获取用户配置失败:', error)
    return new NextResponse(null, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('userId')?.value

    if (!userId) {
      return new NextResponse(null, { status: 401 })
    }

    // 先获取当前用户的完整配置，保留其他字段（如 featureUpdateReadVersion）
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { config: true }
    })

    if (!user) {
      return new NextResponse(null, { status: 404 })
    }

    const currentConfig = (user.config as Record<string, unknown>) || {}
    const body = await req.json()
    const incomingConfig = (body?.config ?? {}) as Partial<UserConfig>

    const fullUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { membershipExpiresAt: true }
    }) as { membershipExpiresAt?: Date | null } | null
    const userIsPro = isPro(fullUser?.membershipExpiresAt)

    // 会员默认使用美音女声；非会员不能保存非默认发音
    const incomingVoiceId = (incomingConfig.learning as Record<string, unknown>)?.voiceId as string | undefined
    if (incomingConfig.learning && userIsPro && (!incomingVoiceId || incomingVoiceId === 'default')) {
      (incomingConfig.learning as Record<string, unknown>).voiceId = MEMBER_DEFAULT_VOICE_ID
    } else if (incomingConfig.learning && !userIsPro && incomingVoiceId && PRO_VOICE_IDS.includes(incomingVoiceId)) {
      (incomingConfig.learning as Record<string, unknown>).voiceId = 'default'
    }

    // 合并用户配置
    const mergedUserConfig = normalizeVoiceForMembership(
      mergeConfig(DEFAULT_CONFIG, incomingConfig),
      userIsPro,
    )

    // 保留其他配置字段（如 featureUpdateReadVersion, completedTours）
    const finalConfig = {
      ...mergedUserConfig,
      featureUpdateReadVersion: currentConfig.featureUpdateReadVersion ?? undefined,
      completedTours: currentConfig.completedTours ?? undefined,
    } as Record<string, unknown>

    await prisma.user.update({
      where: { id: userId },
      data: { config: finalConfig as unknown as Record<string, string | number | boolean | null> }
    })

    return NextResponse.json({ success: true, config: mergedUserConfig })
  } catch (error) {
    console.error('更新用户配置失败:', error)
    return new NextResponse(null, { status: 500 })
  }
}
