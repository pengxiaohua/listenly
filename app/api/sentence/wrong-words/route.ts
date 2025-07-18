import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

// 获取用户句子错词本列表
export async function GET(request: NextRequest) {
  const user = await auth();
  if (!user) {
    return NextResponse.json({ error: '用户未登录' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = (page - 1) * limit;

  try {
    // 获取句子错词记录
    const [sentenceRecords, total] = await Promise.all([
      prisma.sentenceRecord.findMany({
        where: {
          userId: user.id,
          errorCount: {
            gt: 0,
          },
        },
        include: {
          sentence: {
            include: {
              corpus: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip: offset,
        take: limit,
      }),
      prisma.sentenceRecord.count({
        where: {
          userId: user.id,
          errorCount: {
            gt: 0,
          },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: sentenceRecords,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('获取句子错词本失败:', error);
    return NextResponse.json({ error: '获取句子错词本失败' }, { status: 500 });
  }
}
