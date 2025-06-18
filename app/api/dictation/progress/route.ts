import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(req: Request) {
  const userId = req.headers.get('x-user-id');
  const progress = await prisma.dictationProgress.findFirst({
    where: { userId: userId ?? '' },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(progress || { position: 0 });
}

export async function POST(req: Request) {
  const userId = req.headers.get('x-user-id');
  const { position, attempt } = await req.json();

  const progress = await prisma.dictationProgress.upsert({
    where: {
      userId_lrcFile: {
        userId: userId ?? '',
        lrcFile: "2014-12-01.lrc",
      },
    },
    update: {
      position,
      attempts: {
        push: attempt,
      },
    },
    create: {
      userId: userId ?? '',
      lrcFile: "2014-12-01.lrc",
      position,
      attempts: [attempt],
    },
  });

  return NextResponse.json(progress);
}
