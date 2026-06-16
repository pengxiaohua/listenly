import { prisma } from '@/lib/prisma'

export const VIRTUAL_GROUP_SIZE = 20

/** 与 /api/word/group 虚拟分组逻辑一致：按 index、id 排序后按固定大小切片 */
export async function getVirtualGroupWordIds(
  wordSetId: number,
  virtualOrder: number,
  groupSize = VIRTUAL_GROUP_SIZE,
): Promise<string[]> {
  const allWords = await prisma.word.findMany({
    where: { wordSetId },
    select: { id: true },
    orderBy: [{ index: 'asc' }, { id: 'asc' }],
  })
  const start = (virtualOrder - 1) * groupSize
  return allWords.slice(start, start + groupSize).map((w) => w.id)
}

export const finishedWordRecordFilter = (userId: string) => ({
  userId,
  archived: false,
  OR: [{ isCorrect: true }, { isMastered: true }],
})
