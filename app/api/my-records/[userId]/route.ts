import { NextRequest } from 'next/server';
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const filter = searchParams.get('filter') || 'all';
    const category = searchParams.get('category') || 'all';

    // 构建查询条件
    const where: any = {
      userId: params.userId,
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

    return Response.json({
      records,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error('Error fetching records:', error);
    return Response.json(
      { error: 'Failed to fetch records' },
      { status: 500 }
    );
  }
}