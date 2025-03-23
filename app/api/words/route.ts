import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// 更新拼写历史记录
async function updateWordStatus(
  wordId: number,
  userId: string,
  category: string,
  isCorrect: boolean
) {
  const record = await prisma.records.upsert({
    where: {
      user_id_word_id_category: {
        user_id: userId,
        word_id: wordId,
        category: category,
      },
    },
    update: {
      attempt_count: { increment: 1 },
      correct_count: isCorrect ? { increment: 1 } : 0,
      last_attempted_at: new Date(),
    },
    create: {
      user_id: userId,
      word_id: wordId,
      category: category,
      attempt_count: 1,
      correct_count: isCorrect ? 1 : 0,
    },
  });

  // 更新单词的拼写状态
  if (isCorrect) {
    await prisma.words.update({
      where: { id: wordId },
      data: {
        is_correct: true,
      },
    });
  }
}

// 获取下一个单词 API
export async function GET(req: Request) {
  const { category, userId } = await req.json();
  const word = await prisma.words.findFirst({
    where: {
      category: category,
      is_correct: false,
      spelling_records: {
        none: {
          user_id: userId,
        },
      },
    },
  });
  return new Response(JSON.stringify(word), { status: word ? 200 : 404 });
}

// 更新拼写状态 API
export async function PUT(req: Request) {
  const { wordId, userId, category, isCorrect } = await req.json();
  await updateWordStatus(wordId, userId, category, isCorrect);
  return new Response("Word status updated", { status: 200 });
}
