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
          isMastered: false, // 只显示未掌握的错词
        },
        include: {
          sentence: {
            include: {
              sentenceSet: true,
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
          isMastered: false,
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

// 更新句子错词的掌握状态
export async function PATCH(request: NextRequest) {
  const user = await auth();
  if (!user) {
    return NextResponse.json({ error: '用户未登录' }, { status: 401 });
  }

  try {
    const { id, isMastered } = await request.json();

    if (!id || typeof isMastered !== 'boolean') {
      return NextResponse.json({ error: '参数错误' }, { status: 400 });
    }

    // 更新句子记录状态
    const sentenceRecord = await prisma.sentenceRecord.update({
      where: {
        id: Number(id),
        userId: user.id, // 确保只能更新自己的记录
      },
      data: {
        isMastered,
      },
    });

    return NextResponse.json({
      success: true,
      data: sentenceRecord,
    });
  } catch (error) {
    console.error('更新句子错词状态失败:', error);
    return NextResponse.json({ error: '更新句子错词状态失败' }, { status: 500 });
  }
}
