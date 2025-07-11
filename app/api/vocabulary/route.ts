import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

// 获取用户生词本列表
export async function GET(request: NextRequest) {
  const user = await auth();
  if (!user) {
    return NextResponse.json({ error: '用户未登录' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type'); // 'word' 或 'sentence'
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = (page - 1) * limit;

  try {
    const where = {
      userId: user.id,
      ...(type && { type }),
    };

    const [vocabularies, total] = await Promise.all([
      prisma.vocabulary.findMany({
        where,
        include: {
          word: type === 'word' ? true : false,
          sentence: type === 'sentence' ? {
            include: {
              corpus: true,
            },
          } : false,
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip: offset,
        take: limit,
      }),
      prisma.vocabulary.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: vocabularies,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('获取生词本失败:', error);
    return NextResponse.json({ error: '获取生词本失败' }, { status: 500 });
  }
}

// 添加到生词本
export async function POST(request: NextRequest) {
  const user = await auth();
  if (!user) {
    return NextResponse.json({ error: '用户未登录' }, { status: 401 });
  }

  try {
    const { type, wordId, sentenceId, note } = await request.json();

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
        ...(type === 'sentence' && { sentenceId }),
      },
    });

    if (existing) {
      return NextResponse.json({ error: '已存在于生词本中' }, { status: 409 });
    }

    const vocabulary = await prisma.vocabulary.create({
      data: {
        userId: user.id,
        type,
        wordId: type === 'word' ? wordId : null,
        sentenceId: type === 'sentence' ? sentenceId : null,
        note,
      },
      include: {
        word: type === 'word' ? true : false,
        sentence: type === 'sentence' ? {
          include: {
            corpus: true,
          },
        } : false,
      },
    });

    return NextResponse.json({
      success: true,
      data: vocabulary,
      message: '已添加到生词本',
    });
  } catch (error) {
    console.error('添加到生词本失败:', error);
    return NextResponse.json({ error: '添加到生词本失败' }, { status: 500 });
  }
}

// 从生词本删除
export async function DELETE(request: NextRequest) {
  const user = await auth();
  if (!user) {
    return NextResponse.json({ error: '用户未登录' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: '缺少生词本ID' }, { status: 400 });
    }

    // 检查是否存在且属于当前用户
    const vocabulary = await prisma.vocabulary.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!vocabulary) {
      return NextResponse.json({ error: '生词本记录不存在' }, { status: 404 });
    }

    await prisma.vocabulary.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: '已从生词本删除',
    });
  } catch (error) {
    console.error('从生词本删除失败:', error);
    return NextResponse.json({ error: '从生词本删除失败' }, { status: 500 });
  }
}

// 更新生词本备注
export async function PUT(request: NextRequest) {
  const user = await auth();
  if (!user) {
    return NextResponse.json({ error: '用户未登录' }, { status: 401 });
  }

  try {
    const { id, note } = await request.json();

    if (!id) {
      return NextResponse.json({ error: '缺少生词本ID' }, { status: 400 });
    }

    // 检查是否存在且属于当前用户
    const vocabulary = await prisma.vocabulary.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!vocabulary) {
      return NextResponse.json({ error: '生词本记录不存在' }, { status: 404 });
    }

    const updatedVocabulary = await prisma.vocabulary.update({
      where: { id },
      data: { note },
      include: {
        word: vocabulary.type === 'word' ? true : false,
        sentence: vocabulary.type === 'sentence' ? {
          include: {
            corpus: true,
          },
        } : false,
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedVocabulary,
      message: '备注更新成功',
    });
  } catch (error) {
    console.error('更新生词本备注失败:', error);
    return NextResponse.json({ error: '更新生词本备注失败' }, { status: 500 });
  }
}
