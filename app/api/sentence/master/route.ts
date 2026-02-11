import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const user = await auth();
  if (!user) {
    return NextResponse.json({ error: '用户未登录' }, { status: 401 });
  }

  const { sentenceId } = await req.json();
  if (!sentenceId) {
    return NextResponse.json({ error: '缺少参数' }, { status: 400 });
  }

  try {
    // Update all records for this sentence to mastered
    await prisma.sentenceRecord.updateMany({
      where: {
        userId: user.id,
        sentenceId: Number(sentenceId),
        isMastered: false, // Only update unmastered ones
      },
      data: {
        isMastered: true,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('更新掌握状态失败:', error);
    return NextResponse.json({ error: '操作失败' }, { status: 500 });
  }
}
