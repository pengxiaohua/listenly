import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

type GroupKind = 'UNIT' | 'TYPE' | 'SIZE' | 'MANUAL' | 'NONE'

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function findOrCreateWordGroup(tx: typeof prisma, params: { setId: number, name: string, kind: GroupKind, order?: number }) {
  const { setId, name, kind } = params
  const slug = slugify(name)
  const existing = await tx.wordGroup.findFirst({ where: { wordSetId: setId, slug } })
  if (existing) return existing
  let order = params.order
  if (order == null) {
    const max = await tx.wordGroup.findFirst({ where: { wordSetId: setId }, orderBy: { order: 'desc' }, select: { order: true } })
    order = (max?.order || 0) + 1
  }
  return tx.wordGroup.create({ data: { wordSetId: setId, name, slug, kind, order } })
}

async function findOrCreateSentenceGroup(tx: typeof prisma, params: { setId: number, name: string, kind: GroupKind, order?: number }) {
  const { setId, name, kind } = params
  const slug = slugify(name)
  const existing = await tx.sentenceGroup.findFirst({ where: { sentenceSetId: setId, slug } })
  if (existing) return existing
  let order = params.order
  if (order == null) {
    const max = await tx.sentenceGroup.findFirst({ where: { sentenceSetId: setId }, orderBy: { order: 'desc' }, select: { order: true } })
    order = (max?.order || 0) + 1
  }
  return tx.sentenceGroup.create({ data: { sentenceSetId: setId, name, slug, kind, order } })
}

async function findOrCreateShadowingGroup(tx: typeof prisma, params: { setId: number, name: string, kind: GroupKind, order?: number }) {
  const { setId, name, kind } = params
  const slug = slugify(name)
  const existing = await tx.shadowingGroup.findFirst({ where: { shadowingSetId: setId, slug } })
  if (existing) return existing
  let order = params.order
  if (order == null) {
    const max = await tx.shadowingGroup.findFirst({ where: { shadowingSetId: setId }, orderBy: { order: 'desc' }, select: { order: true } })
    order = (max?.order || 0) + 1
  }
  return tx.shadowingGroup.create({ data: { shadowingSetId: setId, name, slug, kind, order } })
}

// 导入单词到 WordSet
export const POST = withAdminAuth(async (req: NextRequest) => {
  try {
    const body = await req.json().catch(() => ({}))
    const url = new URL(req.url)
    const typeQP = url.searchParams.get('type') as ('WORD'|'SENTENCE'|'SHADOWING'|null)
    const setIdQP = url.searchParams.get('setId')

    const type = (body?.type || typeQP) as 'WORD'|'SENTENCE'|'SHADOWING'|undefined
    const setId = Number(body?.setId ?? (setIdQP ?? NaN))

    // 允许 body 直接为数组
    const data: any[] = Array.isArray(body?.data)
      ? body.data
      : (Array.isArray(body) ? (body as any[]) : [])

    const groups: Array<{ name: string; kind?: GroupKind; order?: number; items: any[] }>|undefined = !Array.isArray(body) ? body.groups : undefined
    const strategy: 'SIZE'|undefined = !Array.isArray(body) ? body.strategy : undefined
    const size: number|undefined = !Array.isArray(body) ? body.size : undefined
    const namePattern: string|undefined = !Array.isArray(body) ? body.namePattern : undefined
    const startIndex: number|undefined = !Array.isArray(body) ? body.startIndex : undefined

    if (!type || !setId || Number.isNaN(setId)) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 })
    }

    if (type !== 'WORD' && type !== 'SENTENCE' && type !== 'SHADOWING') {
      return NextResponse.json({ error: 'type 必须是 WORD、SENTENCE 或 SHADOWING' }, { status: 400 })
    }

    // 验证 set 是否存在
    if (type === 'WORD') {
      const wordSet = await prisma.wordSet.findUnique({ where: { id: setId } })
      if (!wordSet) {
        return NextResponse.json({ error: '单词集不存在' }, { status: 404 })
      }
    } else if (type === 'SENTENCE') {
      const sentenceSet = await prisma.sentenceSet.findUnique({ where: { id: setId } })
      if (!sentenceSet) {
        return NextResponse.json({ error: '句子集不存在' }, { status: 404 })
      }
    } else {
      const shadowingSetExists = await prisma.$queryRaw<{ exists: boolean }[]>`
        SELECT EXISTS(SELECT 1 FROM "ShadowingSet" WHERE id = ${setId}) AS exists
      `.then(rows => Boolean(rows[0]?.exists))
      if (!shadowingSetExists) {
        return NextResponse.json({ error: '跟读集不存在' }, { status: 404 })
      }
    }

    let successCount = 0
    let failedCount = 0
    const errors: Array<{ index: number; error: string; data: unknown }> = []

    // 分批处理
    const batchSize = 50

    // 先处理分块 groups（如果提供）
    if (groups && Array.isArray(groups) && groups.length > 0) {
      if (type === 'WORD') {
        for (const g of groups) {
          await prisma.$transaction(async (tx) => {
            const group = await findOrCreateWordGroup(tx, { setId, name: g.name, kind: (g.kind || 'UNIT') })
            let next = await tx.word.findFirst({ where: { wordGroupId: group.id }, orderBy: { groupIndex: 'desc' }, select: { groupIndex: true } }).then(r => (r?.groupIndex || 0) + 1)
            for (let j = 0; j < (g.items || []).length; j++) {
              const item = g.items[j]
              if (!item?.word) continue
              const salt = 'listenly_word_salt_2024'
              const ossKey = crypto.createHash('md5').update(item.word + salt).digest('hex')
              await tx.word.upsert({
                where: { word_wordSetId: { word: item.word, wordSetId: setId } },
                update: {
                  phoneticUS: item.phoneticUS || item.phonetic || '',
                  phoneticUK: item.phoneticUK || item.phonetic || '',
                  definition: item.definition || '',
                  translation: item.translation || '',
                  exchange: item.exchange || '',
                  audioStatus: 'PENDING',
                  ossKey,
                  wordGroupId: group.id,
                  groupIndex: next++,
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
                  ossKey,
                  wordGroupId: group.id,
                  groupIndex: next++,
                },
              })
              successCount++
            }
          })
        }
      } else if (type === 'SENTENCE') {
        for (const g of groups) {
          await prisma.$transaction(async (tx) => {
            const group = await findOrCreateSentenceGroup(tx, { setId, name: g.name, kind: (g.kind || 'UNIT') })
            let next = await tx.sentence.findFirst({ where: { sentenceGroupId: group.id }, orderBy: { groupIndex: 'desc' }, select: { groupIndex: true } }).then(r => (r?.groupIndex || 0) + 1)
            // 获取当前最大 index 作为新增基准
            const maxIndexRecord = await tx.sentence.findFirst({ where: { sentenceSetId: setId }, orderBy: { index: 'desc' }, select: { index: true } })
            let globalNext = (maxIndexRecord?.index || 0)
            for (const item of (g.items || [])) {
              if (!item?.text) continue
              const salt = 'listenly_sentence_salt_2024'
              const ossKey = crypto.createHash('md5').update(item.text + salt).digest('hex')
              const nextIndex = ++globalNext
              await tx.sentence.upsert({
                where: { index_sentenceSetId: { index: nextIndex, sentenceSetId: setId } },
                update: {
                  text: item.text,
                  translation: item.translation || '',
                  audioStatus: 'PENDING',
                  ossKey,
                  sentenceGroupId: group.id,
                  groupIndex: next++,
                },
                create: {
                  index: nextIndex,
                  text: item.text,
                  translation: item.translation || '',
                  sentenceSetId: setId,
                  audioStatus: 'PENDING',
                  ossKey,
                  sentenceGroupId: group.id,
                  groupIndex: next++,
                },
              })
              successCount++
            }
          })
        }
      } else {
        for (const g of groups) {
          await prisma.$transaction(async (tx) => {
            const group = await findOrCreateShadowingGroup(tx, { setId, name: g.name, kind: (g.kind || 'UNIT') })
            let next = await tx.shadowing.findFirst({ where: { shadowingGroupId: group.id }, orderBy: { groupIndex: 'desc' }, select: { groupIndex: true } }).then(r => (r?.groupIndex || 0) + 1)
            const maxIndexRecord = await tx.$queryRaw<{ index: number }[]>`
              SELECT "index" FROM "Shadowing" WHERE "shadowingSetId" = ${setId} ORDER BY "index" DESC LIMIT 1
            `.then(rows => rows[0])
            let globalNext = (maxIndexRecord?.index || 0)
            for (const item of (g.items || [])) {
              if (!item?.text) continue
              const salt = 'listenly_shadowing_salt_2024'
              const ossKey = crypto.createHash('md5').update(item.text + salt).digest('hex')
              const nextIndex = ++globalNext
              await tx.$executeRaw`
                INSERT INTO "Shadowing" ("index", "text", "translation", "shadowingSetId", "audioStatus", "ossKey", "shadowingGroupId", "groupIndex")
                VALUES (${nextIndex}, ${item.text}, ${item.translation || ''}, ${setId}, 'PENDING', ${ossKey}, ${group.id}, ${next})
                ON CONFLICT ("index", "shadowingSetId") DO UPDATE SET
                  "text" = EXCLUDED."text",
                  "translation" = EXCLUDED."translation",
                  "audioStatus" = EXCLUDED."audioStatus",
                  "ossKey" = EXCLUDED."ossKey",
                  "shadowingGroupId" = EXCLUDED."shadowingGroupId",
                  "groupIndex" = EXCLUDED."groupIndex"
              `
              next++
              successCount++
            }
          })
        }
      }
    }

    if (type === 'WORD' && data.length) {
      // 导入单词
      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize)

        try {
          await prisma.$transaction(
            async (tx) => {
              // 组本地游标：key = kind|name
              const groupCursor = new Map<string, { id: number, next: number }>()
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

                  // 处理 unit/type 分组（可选）
                  let wordGroupId: number | undefined
                  let groupIndex: number | undefined
                  const name: string | undefined = item.unit || item.type
                  const kind: GroupKind | undefined = item.unit ? 'UNIT' : (item.type ? 'TYPE' : undefined)
                  if (name && kind) {
                    const key = `${kind}|${name}`
                    let entry = groupCursor.get(key)
                    if (!entry) {
                      const g = await findOrCreateWordGroup(tx, { setId, name, kind })
                      const next = await tx.word.findFirst({ where: { wordGroupId: g.id }, orderBy: { groupIndex: 'desc' }, select: { groupIndex: true } }).then(r => (r?.groupIndex || 0) + 1)
                      entry = { id: g.id, next }
                      groupCursor.set(key, entry)
                    }
                    wordGroupId = entry.id
                    groupIndex = item.groupIndex ?? entry.next++
                  }

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
                      wordGroupId,
                      groupIndex,
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
                      wordGroupId,
                      groupIndex,
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
    } else if (type === 'SENTENCE' && data.length) {
      // 导入句子
      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize)

        try {
          await prisma.$transaction(
            async (tx) => {
              const groupCursor = new Map<string, { id: number, next: number }>()
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

                  // unit/type 分组（可选）
                  let sentenceGroupId: number | undefined
                  let groupIndex: number | undefined
                  const name: string | undefined = item.unit || item.type
                  const kind: GroupKind | undefined = item.unit ? 'UNIT' : (item.type ? 'TYPE' : undefined)
                  if (name && kind) {
                    const key = `${kind}|${name}`
                    let entry = groupCursor.get(key)
                    if (!entry) {
                      const g = await findOrCreateSentenceGroup(tx, { setId, name, kind })
                      const next = await tx.sentence.findFirst({ where: { sentenceGroupId: g.id }, orderBy: { groupIndex: 'desc' }, select: { groupIndex: true } }).then(r => (r?.groupIndex || 0) + 1)
                      entry = { id: g.id, next }
                      groupCursor.set(key, entry)
                    }
                    sentenceGroupId = entry.id
                    groupIndex = item.groupIndex ?? entry.next++
                  }

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
                      sentenceGroupId,
                      groupIndex,
                    },
                    create: {
                      index: nextIndex,
                      text: item.text,
                      translation: item.translation || '',
                      sentenceSetId: setId,
                      audioStatus: 'PENDING',
                      ossKey: ossKey,
                      sentenceGroupId,
                      groupIndex,
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
    } else if (type === 'SHADOWING' && data.length) {
      // 导入跟读（Shadowing）
      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize)

        try {
          await prisma.$transaction(
            async (tx) => {
              const groupCursor = new Map<string, { id: number, next: number }>()
              for (let j = 0; j < batch.length; j++) {
                const item = batch[j]
                const itemIndex = i + j

                try {
                  if (!item.text || typeof item.text !== 'string') {
                    throw new Error('text 字段必须是非空字符串')
                  }

                  // 生成 ossKey (使用 MD5 加盐)
                  const salt = 'listenly_shadowing_salt_2024'
                  const ossKey = crypto
                    .createHash('md5')
                    .update(item.text + salt)
                    .digest('hex')

                  // 获取当前最大 index
                  const maxIndexRecord = await tx.$queryRaw<{ index: number }[]>`
                    SELECT "index" FROM "Shadowing"
                    WHERE "shadowingSetId" = ${setId}
                    ORDER BY "index" DESC
                    LIMIT 1
                  `.then(rows => rows[0])

                  const nextIndex = (maxIndexRecord?.index || 0) + 1 + j

                  // unit/type 分组（可选）
                  let shadowingGroupId: number | undefined
                  let groupIndex: number | undefined
                  const name: string | undefined = item.unit || item.type
                  const kind: GroupKind | undefined = item.unit ? 'UNIT' : (item.type ? 'TYPE' : undefined)
                  if (name && kind) {
                    const key = `${kind}|${name}`
                    let entry = groupCursor.get(key)
                    if (!entry) {
                      const g = await findOrCreateShadowingGroup(tx, { setId, name, kind })
                      const next = await tx.shadowing.findFirst({ where: { shadowingGroupId: g.id }, orderBy: { groupIndex: 'desc' }, select: { groupIndex: true } }).then(r => (r?.groupIndex || 0) + 1)
                      entry = { id: g.id, next }
                      groupCursor.set(key, entry)
                    }
                    shadowingGroupId = entry.id
                    groupIndex = item.groupIndex ?? entry.next++
                  }

                  await tx.$executeRaw`
                    INSERT INTO "Shadowing" ("index", "text", "translation", "shadowingSetId", "audioStatus", "ossKey", "shadowingGroupId", "groupIndex")
                    VALUES (${nextIndex}, ${item.text}, ${item.translation || ''}, ${setId}, 'PENDING', ${ossKey}, ${shadowingGroupId}, ${groupIndex})
                    ON CONFLICT ("index", "shadowingSetId") DO UPDATE SET
                      "text" = EXCLUDED."text",
                      "translation" = EXCLUDED."translation",
                      "audioStatus" = EXCLUDED."audioStatus",
                      "ossKey" = EXCLUDED."ossKey",
                      "shadowingGroupId" = EXCLUDED."shadowingGroupId",
                      "groupIndex" = EXCLUDED."groupIndex"
                  `

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

    // SIZE 策略：按固定数量切片（当 strategy=SIZE 提供时执行）
    if (strategy === 'SIZE' && size && size > 0) {
      if (type === 'WORD') {
        await prisma.$transaction(async (tx) => {
          // 清理旧 SIZE 组并解绑
          const sizeGroups = await tx.wordGroup.findMany({ where: { wordSetId: setId, kind: 'SIZE' } })
          if (sizeGroups.length) {
            const ids = sizeGroups.map(g => g.id)
            await tx.word.updateMany({ where: { wordGroupId: { in: ids } }, data: { wordGroupId: null, groupIndex: null } })
            await tx.wordGroup.deleteMany({ where: { id: { in: ids } } })
          }
          const words = await tx.word.findMany({ where: { wordSetId: setId }, orderBy: [{ index: 'asc' as const }, { createdAt: 'asc' as const }, { id: 'asc' as const }], select: { id: true } })
          let groupOrder = 1
          for (let i = 0; i < words.length; i += size) {
            const slice = words.slice(i, i + size)
            const name = (namePattern || '第{n}组').replace('{n}', String(groupOrder))
            const g = await findOrCreateWordGroup(tx, { setId, name, kind: 'SIZE', order: groupOrder })
            for (let j = 0; j < slice.length; j++) {
              await tx.word.update({ where: { id: slice[j].id }, data: { wordGroupId: g.id, groupIndex: j + 1 } })
            }
            groupOrder++
          }
        })
      } else if (type === 'SENTENCE') {
        await prisma.$transaction(async (tx) => {
          const sizeGroups = await tx.sentenceGroup.findMany({ where: { sentenceSetId: setId, kind: 'SIZE' } })
          if (sizeGroups.length) {
            const ids = sizeGroups.map(g => g.id)
            await tx.sentence.updateMany({ where: { sentenceGroupId: { in: ids } }, data: { sentenceGroupId: null, groupIndex: null } })
            await tx.sentenceGroup.deleteMany({ where: { id: { in: ids } } })
          }
          const items = await tx.sentence.findMany({ where: { sentenceSetId: setId }, orderBy: [{ index: 'asc' as const }], select: { id: true } })
          let groupOrder = 1
          for (let i = (startIndex ? startIndex - 1 : 0); i < items.length; i += size) {
            const slice = items.slice(i, i + size)
            const name = (namePattern || '第{n}组').replace('{n}', String(groupOrder))
            const g = await findOrCreateSentenceGroup(tx, { setId, name, kind: 'SIZE', order: groupOrder })
            for (let j = 0; j < slice.length; j++) {
              await tx.sentence.update({ where: { id: slice[j].id }, data: { sentenceGroupId: g.id, groupIndex: j + 1 } })
            }
            groupOrder++
          }
        })
      } else if (type === 'SHADOWING') {
        await prisma.$transaction(async (tx) => {
          const sizeGroups = await tx.shadowingGroup.findMany({ where: { shadowingSetId: setId, kind: 'SIZE' } })
          if (sizeGroups.length) {
            const ids = sizeGroups.map(g => g.id)
            await tx.shadowing.updateMany({ where: { shadowingGroupId: { in: ids } }, data: { shadowingGroupId: null, groupIndex: null } })
            await tx.shadowingGroup.deleteMany({ where: { id: { in: ids } } })
          }
          const items = await tx.shadowing.findMany({ where: { shadowingSetId: setId }, orderBy: [{ index: 'asc' as const }], select: { id: true } })
          let groupOrder = 1
          for (let i = (startIndex ? startIndex - 1 : 0); i < items.length; i += size) {
            const slice = items.slice(i, i + size)
            const name = (namePattern || '第{n}组').replace('{n}', String(groupOrder))
            const g = await findOrCreateShadowingGroup(tx, { setId, name, kind: 'SIZE', order: groupOrder })
            for (let j = 0; j < slice.length; j++) {
              await tx.shadowing.update({ where: { id: slice[j].id }, data: { shadowingGroupId: g.id, groupIndex: j + 1 } })
            }
            groupOrder++
          }
        })
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

