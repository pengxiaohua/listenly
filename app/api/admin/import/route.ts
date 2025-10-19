import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

// 导入单词到 WordSet
export const POST = withAdminAuth(async (req: NextRequest) => {
  try {
    const body = await req.json()
    const { type, setId, data } = body

    if (!type || !setId || !data || !Array.isArray(data)) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 })
    }

    if (type !== 'WORD' && type !== 'SENTENCE') {
      return NextResponse.json({ error: 'type 必须是 WORD 或 SENTENCE' }, { status: 400 })
    }

    // 验证 set 是否存在
    if (type === 'WORD') {
      const wordSet = await prisma.wordSet.findUnique({ where: { id: setId } })
      if (!wordSet) {
        return NextResponse.json({ error: '单词集不存在' }, { status: 404 })
      }
    } else {
      const sentenceSet = await prisma.sentenceSet.findUnique({ where: { id: setId } })
      if (!sentenceSet) {
        return NextResponse.json({ error: '句子集不存在' }, { status: 404 })
      }
    }

    let successCount = 0
    let failedCount = 0
    const errors: Array<{ index: number; error: string; data: unknown }> = []

    // 分批处理
    const batchSize = 50

    if (type === 'WORD') {
      // 导入单词
      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize)

        try {
          await prisma.$transaction(
            async (tx) => {
              for (let j = 0; j < batch.length; j++) {
                const item = batch[j]
                const itemIndex = i + j

                try {
                  if (!item.word || typeof item.word !== 'string') {
                    throw new Error('word 字段必须是非空字符串')
                  }

                  // 生成 ossKey (使用 MD5 加盐)
                  const salt = 'listenly_word_salt_2024'
                  const ossKey = crypto
                    .createHash('md5')
                    .update(item.word + salt)
                    .digest('hex')

                  await tx.word.upsert({
                    where: {
                      word_wordSetId: {
                        word: item.word,
                        wordSetId: setId,
                      },
                    },
                    update: {
                      phoneticUS: item.phoneticUS || item.phonetic || '',
                      phoneticUK: item.phoneticUK || item.phonetic || '',
                      definition: item.definition || '',
                      translation: item.translation || '',
                      exchange: item.exchange || '',
                      audioStatus: 'PENDING',
                      ossKey: ossKey,
                    },
                    create: {
                      word: item.word,
                      phoneticUS: item.phoneticUS || item.phonetic || '',
                      phoneticUK: item.phoneticUK || item.phonetic || '',
                      definition: item.definition || '',
                      translation: item.translation || '',
                      exchange: item.exchange || '',
                      wordSetId: setId,
                      audioStatus: 'PENDING',
                      ossKey: ossKey,
                    },
                  })

                  successCount++
                } catch (err) {
                  failedCount++
                  errors.push({
                    index: itemIndex,
                    error: err instanceof Error ? err.message : String(err),
                    data: item,
                  })
                }
              }
            },
            {
              timeout: 30000,
              maxWait: 10000,
            }
          )
        } catch (err) {
          console.error(`批次 ${i / batchSize + 1} 处理失败:`, err)
          failedCount += batch.length - (successCount % batchSize)
        }
      }
    } else {
      // 导入句子
      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize)

        try {
          await prisma.$transaction(
            async (tx) => {
              for (let j = 0; j < batch.length; j++) {
                const item = batch[j]
                const itemIndex = i + j

                try {
                  if (!item.text || typeof item.text !== 'string') {
                    throw new Error('text 字段必须是非空字符串')
                  }

                  // 生成 ossKey (使用 MD5 加盐)
                  const salt = 'listenly_sentence_salt_2024'
                  const ossKey = crypto
                    .createHash('md5')
                    .update(item.text + salt)
                    .digest('hex')

                  // 获取当前最大 index
                  const maxIndexRecord = await tx.sentence.findFirst({
                    where: { sentenceSetId: setId },
                    orderBy: { index: 'desc' },
                    select: { index: true },
                  })

                  const nextIndex = (maxIndexRecord?.index || 0) + 1 + j

                  await tx.sentence.upsert({
                    where: {
                      index_sentenceSetId: {
                        index: nextIndex,
                        sentenceSetId: setId,
                      },
                    },
                    update: {
                      text: item.text,
                      translation: item.translation || '',
                      audioStatus: 'PENDING',
                      ossKey: ossKey,
                    },
                    create: {
                      index: nextIndex,
                      text: item.text,
                      translation: item.translation || '',
                      sentenceSetId: setId,
                      audioStatus: 'PENDING',
                      ossKey: ossKey,
                    },
                  })

                  successCount++
                } catch (err) {
                  failedCount++
                  errors.push({
                    index: itemIndex,
                    error: err instanceof Error ? err.message : String(err),
                    data: item,
                  })
                }
              }
            },
            {
              timeout: 30000,
              maxWait: 10000,
            }
          )
        } catch (err) {
          console.error(`批次 ${i / batchSize + 1} 处理失败:`, err)
          failedCount += batch.length - (successCount % batchSize)
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `导入完成: 成功 ${successCount} 条, 失败 ${failedCount} 条`,
      successCount,
      failedCount,
      errors: errors.slice(0, 10), // 只返回前 10 个错误
    })
  } catch (error) {
    console.error('导入失败:', error)
    return NextResponse.json(
      { error: '导入失败', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
})

