import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

const VALID_CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const VALID_MODES = ['reading', 'listening'];

// 保存测评结果
export async function POST(request: NextRequest) {
  const user = await auth();
  if (!user) {
    return NextResponse.json({ error: '用户未登录' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { finalVocab, cefrLevel, phase2CorrectRate, phase3CorrectRate, mode = 'reading' } = body;

    if (
      typeof finalVocab !== 'number' ||
      !Number.isInteger(finalVocab) ||
      finalVocab < 0
    ) {
      return NextResponse.json({ error: 'finalVocab 必须为非负整数' }, { status: 400 });
    }

    if (typeof cefrLevel !== 'string' || !VALID_CEFR_LEVELS.includes(cefrLevel)) {
      return NextResponse.json({ error: 'cefrLevel 必须为有效的 CEFR 等级 (A1-C2)' }, { status: 400 });
    }

    if (typeof phase2CorrectRate !== 'number' || phase2CorrectRate < 0 || phase2CorrectRate > 1) {
      return NextResponse.json({ error: 'phase2CorrectRate 必须为 0.0-1.0 之间的数值' }, { status: 400 });
    }

    if (typeof phase3CorrectRate !== 'number' || phase3CorrectRate < 0 || phase3CorrectRate > 1) {
      return NextResponse.json({ error: 'phase3CorrectRate 必须为 0.0-1.0 之间的数值' }, { status: 400 });
    }

    if (!VALID_MODES.includes(mode)) {
      return NextResponse.json({ error: 'mode 必须为 reading 或 listening' }, { status: 400 });
    }

    const record = await prisma.vocabAssessment.create({
      data: {
        userId: user.id,
        finalVocab,
        cefrLevel,
        phase2CorrectRate,
        phase3CorrectRate,
        mode,
      },
    });

    return NextResponse.json({ success: true, data: record }, { status: 201 });
  } catch (error) {
    console.error('保存测评结果失败:', error);
    return NextResponse.json({ error: '保存测评结果失败' }, { status: 500 });
  }
}

// 获取历史测评记录
export async function GET(request: NextRequest) {
  const user = await auth();
  if (!user) {
    return NextResponse.json({ error: '用户未登录' }, { status: 401 });
  }

  try {
    const mode = request.nextUrl.searchParams.get('mode');
    const where: Record<string, unknown> = { userId: user.id };
    if (mode && VALID_MODES.includes(mode)) {
      where.mode = mode;
    }

    const records = await prisma.vocabAssessment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ records });
  } catch (error) {
    console.error('获取测评记录失败:', error);
    return NextResponse.json({ error: '获取测评记录失败' }, { status: 500 });
  }
}
