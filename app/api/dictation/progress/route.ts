import { NextResponse } from 'next/server'
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  const progress = await prisma.dictationProgress.findFirst({
    where: { userId: 'hua' },
    orderBy: { updatedAt: 'desc' }
  })

  console.log({progress})

  return NextResponse.json(progress || { position: 0 })
}

export async function POST(req: Request) {
  const { position, attempt } = await req.json()

  const progress = await prisma.dictationProgress.upsert({
    where: {
      userId_lrcFile: {
        userId: 'hua',
        lrcFile: '2014-12-01.lrc'
      }
    },
    update: {
      position,
      attempts: {
        push: attempt
      }
    },
    create: {
      userId: 'hua',
      lrcFile: '2014-12-01.lrc',
      position,
      attempts: [attempt]
    }
  })

  return NextResponse.json(progress)
} 