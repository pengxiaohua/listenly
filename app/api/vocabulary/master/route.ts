import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

// 标记生词本中的项目为已掌握
export async function POST(req: NextRequest) {
  const user = await auth();
  if (!user) {
    return NextResponse.json({ error: '用户未登录' }, { status: 401 });
  }

  try {
    const { wordId, sentenceId } = await req.json();

    if (!wordId && !sentenceId) {
      return NextResponse.json({ error: '缺少参数' }, { status: 400 });
    }

    // 标记生词本中对应的记录为已掌握
    await prisma.vocabulary.updateMany({
      where: {
        userId: user.id,
        ...(wordId && { wordId, type: 'word' }),
        ...(sentenceId && { sentenceId: Number(sentenceId), type: 'sentence' }),
        isMastered: false,
      },
      data: {
        isMastered: true,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('标记生词掌握失败:', error);
    return NextResponse.json({ error: '标记失败' }, { status: 500 });
  }
}
