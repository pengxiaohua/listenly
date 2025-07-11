import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

// 检查生词本中是否已存在特定内容
export async function GET(request: NextRequest) {
  const user = await auth();
  if (!user) {
    return NextResponse.json({ error: '用户未登录' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type'); // 'word' 或 'sentence'
  const wordId = searchParams.get('wordId');
  const sentenceId = searchParams.get('sentenceId');

  try {
    if (!type || (type !== 'word' && type !== 'sentence')) {
      return NextResponse.json({ error: '类型参数错误' }, { status: 400 });
    }

    if (type === 'word' && !wordId) {
      return NextResponse.json({ error: '缺少单词ID' }, { status: 400 });
    }

    if (type === 'sentence' && !sentenceId) {
      return NextResponse.json({ error: '缺少句子ID' }, { status: 400 });
    }

    // 检查是否已存在
    const existing = await prisma.vocabulary.findFirst({
      where: {
        userId: user.id,
        type,
        ...(type === 'word' && { wordId }),
        ...(type === 'sentence' && { sentenceId: parseInt(sentenceId!) }),
      },
    });

    return NextResponse.json({
      success: true,
      exists: !!existing,
      data: existing || null,
    });
  } catch (error) {
    console.error('检查生词本失败:', error);
    return NextResponse.json({ error: '检查生词本失败' }, { status: 500 });
  }
}
