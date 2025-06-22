import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
) {
  try {
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const filter = searchParams.get('filter') || 'all';
    const category = searchParams.get('category') || 'all';
    console.log({userId});
    // 构建查询条件
    const where: any = {
      userId: userId ?? '',
    };

    if (filter === 'correct') {
      where.isCorrect = true;
    } else if (filter === 'incorrect') {
      where.isCorrect = false;
    }

    if (category !== 'all') {
      where.word = {
        category: category,
      };
    }

    // 计算跳过的记录数
    const skip = (page - 1) * pageSize;

    // 获取总记录数
    const total = await prisma.wordRecord.count({
      where,
    });

    // 获取分页数据
    const records = await prisma.wordRecord.findMany({
      where,
      include: {
        word: true,
      },
      skip,
      take: pageSize,
      orderBy: {
        lastAttempt: 'desc',
      },
    });

    return NextResponse.json({
      records,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error('Error fetching records:', error);
    return NextResponse.json(
      { error: '获取记录失败' },
      { status: 500 }
    );
  }
}
