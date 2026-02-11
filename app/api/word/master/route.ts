import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const user = await auth();
    if (!user) {
      return NextResponse.json({ error: '用户未登录' }, { status: 401 });
    }

    const { wordId } = await req.json();

    if (!wordId) {
      return NextResponse.json({ error: '缺少单词ID' }, { status: 400 });
    }

    // 查找所有相关的错误记录，并标记为已掌握
    // 注意：我们将所有该用户的该单词记录都标记为已掌握
    await prisma.wordRecord.updateMany({
      where: {
        userId: user.id,
        wordId: wordId,
        isMastered: false,
      },
      data: {
        isMastered: true,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('标记单词掌握失败:', error);
    return NextResponse.json({ error: '标记失败' }, { status: 500 });
  }
}
