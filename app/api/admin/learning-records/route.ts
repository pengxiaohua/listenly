import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAdminAuth } from '@/lib/auth';

async function getUserNameMap(userIds: string[]) {
  if (userIds.length === 0) return new Map<string, string>();
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, userName: true },
  });
  return new Map(users.map(u => [u.id, u.userName]));
}

export const GET = withAdminAuth(async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const type = searchParams.get('type') || 'word'; // word | sentence | shadowing | video
    const userId = searchParams.get('userId') || '';
    const skip = (page - 1) * pageSize;

    const where = userId ? { userId } : {};

    if (type === 'word') {
      const [records, total] = await Promise.all([
        prisma.wordRecord.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: { createdAt: 'desc' },
          include: {
            word: {
              select: { id: true, word: true, translation: true, wordSetId: true, wordSet: { select: { name: true } } },
            },
          },
        }),
        prisma.wordRecord.count({ where }),
      ]);

      const userMap = await getUserNameMap([...new Set(records.map(r => r.userId))]);

      return NextResponse.json({
        records: records.map(r => ({
          id: r.id,
          userId: r.userId,
          userName: userMap.get(r.userId) || '未知用户',
          isCorrect: r.isCorrect,
          errorCount: r.errorCount,
          isMastered: r.isMastered,
          createdAt: r.createdAt.toISOString(),
          wordId: r.word.id,
          word: r.word.word,
          translation: r.word.translation,
          setName: r.word.wordSet.name,
        })),
        total,
      });
    }

    if (type === 'sentence') {
      const [records, total] = await Promise.all([
        prisma.sentenceRecord.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: { createdAt: 'desc' },
          include: {
            sentence: {
              select: { id: true, text: true, translation: true, sentenceSetId: true, sentenceSet: { select: { name: true } } },
            },
          },
        }),
        prisma.sentenceRecord.count({ where }),
      ]);

      const userMap = await getUserNameMap([...new Set(records.map(r => r.userId))]);

      return NextResponse.json({
        records: records.map(r => ({
          id: r.id,
          userId: r.userId,
          userName: userMap.get(r.userId) || '未知用户',
          isCorrect: r.isCorrect,
          errorCount: r.errorCount,
          isMastered: r.isMastered,
          createdAt: r.createdAt.toISOString(),
          sentenceId: r.sentence.id,
          sentence: r.sentence.text,
          translation: r.sentence.translation,
          setName: r.sentence.sentenceSet.name,
        })),
        total,
      });
    }

    if (type === 'shadowing') {
      const [records, total] = await Promise.all([
        prisma.shadowingRecord.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: { createdAt: 'desc' },
          include: {
            shadowing: {
              select: { id: true, text: true, translation: true, shadowingSetId: true, shadowingSet: { select: { name: true } } },
            },
          },
        }),
        prisma.shadowingRecord.count({ where }),
      ]);

      const userMap = await getUserNameMap([...new Set(records.map(r => r.userId))]);

      return NextResponse.json({
        records: records.map(r => ({
          id: r.id,
          userId: r.userId,
          userName: userMap.get(r.userId) || '未知用户',
          score: r.score,
          shadowingSentence: r.shadowingSentence,
          createdAt: r.createdAt.toISOString(),
          shadowingId: r.shadowing.id,
          text: r.shadowing.text,
          translation: r.shadowing.translation,
          setName: r.shadowing.shadowingSet.name,
        })),
        total,
      });
    }

    if (type === 'video') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = prisma as any;
      const [records, total] = await Promise.all([
        db.videoRecord.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: { createdAt: 'desc' },
        }),
        db.videoRecord.count({ where }),
      ]) as [Array<{ id: number; userId: string; videoId: number; playedSeconds: number; activeSeconds: number; createdAt: Date }>, number];

      const userIds = [...new Set(records.map(r => r.userId))];
      const userMap = await getUserNameMap(userIds);

      // 获取关联的视频信息
      const videoIds = [...new Set(records.map(r => r.videoId))];
      const videos = await prisma.video.findMany({
        where: { id: { in: videoIds } },
        select: { id: true, title: true, titleZh: true },
      });
      const videoMap = new Map(videos.map(v => [v.id, v]));

      return NextResponse.json({
        records: records.map(r => {
          const video = videoMap.get(r.videoId);
          return {
            id: r.id,
            userId: r.userId,
            userName: userMap.get(r.userId) || '未知用户',
            videoId: r.videoId,
            playedSeconds: r.playedSeconds,
            activeSeconds: r.activeSeconds,
            createdAt: r.createdAt.toISOString(),
            videoTitle: video?.title || '未知视频',
            videoTitleZh: video?.titleZh || '',
          };
        }),
        total,
      });
    }

    return NextResponse.json({ error: '无效的类型参数' }, { status: 400 });
  } catch (error) {
    console.error('获取学习记录失败:', error);
    return NextResponse.json({ error: '获取学习记录失败' }, { status: 500 });
  }
});
