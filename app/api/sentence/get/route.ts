import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const corpusId = searchParams.get('corpusId')
  const sentenceIndex = searchParams.get('sentenceIndex')

  if (!corpusId || !sentenceIndex) {
    return NextResponse.json({ error: '参数缺失' }, { status: 400 })
  }

  const sentence = await prisma.sentence.findFirst({
    where: {
      corpusId: Number(corpusId),
      index: Number(sentenceIndex),
    },
  })

  if (!sentence) {
    return NextResponse.json({ error: '未找到句子' }, { status: 404 })
  }

  return NextResponse.json(sentence)
}
