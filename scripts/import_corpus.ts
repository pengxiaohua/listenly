import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

const prisma = new PrismaClient()

async function main() {
  // 1. 读取TXT文件
  const filePath = path.join(__dirname, '../public/sentences/most_common_100_english_phrases.txt')
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.split('\n').map(line => line.trim()).filter(Boolean)

  // 2. 创建语料库
  const corpus = await prisma.corpus.create({
    data: {
      name: '最常见的100句英语',
      description: '常用英语口语100句',
    }
  })

  // 3. 批量插入句子
  for (let i = 0; i < lines.length; i++) {
    const text = lines[i]
    // 这里假设你有一套规则能拼出audioUrl，比如
    // https://your-oss-domain/most_common_100_english_phrases/{i+1}.mp3
    const audioUrl = `https://your-oss-domain/most_common_100_english_phrases/${i + 1}.mp3`
    await prisma.sentence.create({
      data: {
        corpusId: corpus.id,
        index: i,
        text,
        audioUrl,
      }
    })
  }

  console.log('导入完成')
}

main().catch(e => {
  console.error(e)
  process.exit(1)
}).finally(() => prisma.$disconnect())
