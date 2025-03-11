import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import path from "path";
import fs from "fs/promises";

const prisma = new PrismaClient();

export async function GET() {
  try {
    // 从本地JSON文件读取数据
    const filePath = path.join(process.cwd(), "public/words", "words_1.1.json");
    const fileContent = await fs.readFile(filePath, "utf-8");
    const data = JSON.parse(fileContent);

    let totalInsertCount = 0;

    // 对每个分类单独处理
    for (const category in data) {
      const words = data[category];
      let insertCount = 0;

      // 将单词数组分成更小的批次
      const batchSize = 50; // 减小批次大小
      for (let i = 0; i < words.length; i += batchSize) {
        const batch = words.slice(i, i + batchSize);

        // 每个批次使用单独的事务
        await prisma.$transaction(
          async (tx) => {
            // 串行处理每个单词，避免并发导致的问题
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
            timeout: 10000, // 增加事务超时时间到10秒
            maxWait: 5000, // 最大等待时间5秒
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
    console.error("同步单词数据失败:", error);
    return NextResponse.json(
      {
        success: false,
        message: "同步单词数据失败",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
