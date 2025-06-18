import { NextResponse } from 'next/server'
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(req: Request) {
  const userId = req.headers.get('x-user-id');
  const progress = await prisma.dictationProgress.findMany({
    where: { userId: userId ?? '' },
    orderBy: { updatedAt: 'desc' }
  })

  const stats = progress.map(p => {
    const attempts = p.attempts as { [key: string]: { correct: boolean, sentence: string, userInput: string } }
    const attemptsArray = Object.values(attempts)

    const correct = attemptsArray.filter(a => a.correct).length;

    return {
      lrcFile: p.lrcFile,
      totalAttempts: attempts.length,
      correctCount: correct,
      accuracy: Math.round((correct / attemptsArray.length) * 100) + '%',
      lastUpdated: p.updatedAt.toLocaleDateString()
    }
  })

  return NextResponse.json(stats)
}