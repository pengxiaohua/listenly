import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
import { getUserIdFromRequest } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { sentenceId, userInput, correct } = body

  if (!sentenceId || userInput === undefined || correct === undefined) {
    return NextResponse.json({ error: '参数缺失' }, { status: 400 })
  }

  const userId = await getUserIdFromRequest(req)
  if (!userId) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }

  await prisma.userAttempt.create({
    data: {
      userId: Number(userId),
      sentenceId: Number(sentenceId),
      userInput,
      correct: Boolean(correct),
    }
  })

  return NextResponse.json({ success: true })
}
