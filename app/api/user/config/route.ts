import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { isPro } from '@/lib/membership'

// 非默认发音 voiceId 列表（需要会员）
const PRO_VOICE_IDS = ['English_expressive_narrator', 'English_compelling_lady1', 'English_magnetic_voiced_man', 'English_Upbeat_Woman']

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
    correctEffectType: 'realistic'
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

export async function GET() {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('userId')?.value

    if (!userId) {
      return new NextResponse(null, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { config: true }
    })

    if (!user) {
      return new NextResponse(null, { status: 404 })
    }

    const config = user.config
      ? mergeConfig(DEFAULT_CONFIG, user.config as Partial<UserConfig>)
      : DEFAULT_CONFIG

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

    // 会员校验：非会员不能保存非默认发音
    const incomingVoiceId = (incomingConfig.learning as Record<string, unknown>)?.voiceId as string | undefined
    if (incomingVoiceId && PRO_VOICE_IDS.includes(incomingVoiceId)) {
      const fullUser = await prisma.user.findUnique({
        where: { id: userId },
      }) as { membershipExpiresAt?: Date | null } | null
      if (!isPro(fullUser?.membershipExpiresAt)) {
        // 非会员强制降级为 default
        if (incomingConfig.learning) {
          (incomingConfig.learning as Record<string, unknown>).voiceId = 'default'
        }
      }
    }

    // 合并用户配置
    const mergedUserConfig = mergeConfig(DEFAULT_CONFIG, incomingConfig)

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
