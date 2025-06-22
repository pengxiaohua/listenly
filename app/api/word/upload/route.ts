import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    let totalInsertCount = 0;
    const batchSize = 50;

    // 对每个分类单独处理
    for (const category in data) {
      const words = data[category];
      let insertCount = 0;

      // 将单词数组分成更小的批次
      for (let i = 0; i < words.length; i += batchSize) {
        const batch = words.slice(i, i + batchSize);
        await prisma.$transaction(
          async (tx) => {
            for (const wordData of batch) {
              await tx.word.upsert({
                where: {
                  word_category: {
                    word: wordData.word,
                    category: category,
                  },
                },
                update: {
                  phoneticUS: wordData.phoneticUS || "",
                  phoneticUK: wordData.phoneticUK || "",
                  definition: wordData.definition || "",
                  translation: wordData.translation || "",
                  exchange: wordData.exchange || "",
                },
                create: {
                  word: wordData.word,
                  phoneticUS: wordData.phoneticUS || "",
                  phoneticUK: wordData.phoneticUK || "",
                  definition: wordData.definition || "",
                  translation: wordData.translation || "",
                  exchange: wordData.exchange || "",
                  category: category,
                },
              });
              insertCount++;
            }
          },
          {
            timeout: 10000,
            maxWait: 5000,
          }
        );

        // 每处理完一个批次，输出进度
        totalInsertCount += insertCount;
        console.log(
          `已处理 ${category} 分类的 ${insertCount} 个单词，总计: ${totalInsertCount}`
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: `同步完成，共处理 ${totalInsertCount} 个单词`,
    });
  } catch (error) {
    console.error('处理单词数据失败:', error);
    return NextResponse.json(
      {
        success: false,
        message: '处理单词数据失败',
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
