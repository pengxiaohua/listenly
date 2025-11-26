import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createOssClient, getSignedOssUrl } from '@/lib/oss'

type AppConfigRecord = {
  id: number
  type: string
  name: string
  content: string
  createdAt: Date
  updatedAt: Date
}

type AppConfigDelegate = {
  findUnique: (args: unknown) => Promise<AppConfigRecord | null>
}

const appConfigModel = (prisma as unknown as { appConfig: AppConfigDelegate }).appConfig

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const key = searchParams.get('key')

  if (!key) {
    return NextResponse.json({ error: 'Missing key' }, { status: 400 })
  }

    const client = createOssClient()

  try {
    const config = await appConfigModel.findUnique({
      where: { name: key }
    })

    if (!config) {
      return NextResponse.json({ error: 'Config not found' }, { status: 404 })
    }

    // Only return necessary fields for public
    return NextResponse.json({
      type: config.type,
      content: getSignedOssUrl(client, config.content)
    })
  } catch (error) {
    console.error('Error fetching config:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

