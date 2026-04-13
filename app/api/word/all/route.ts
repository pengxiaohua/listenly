import { NextResponse } from "next/server"
import { prisma } from '@/lib/prisma'

// GET /api/word/all?category=slug&groupId=123 or &offset=0&limit=20
// Returns ALL words in a group (not filtered by completion status)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const wordSetSlug = searchParams.get("category")
    const groupIdParam = searchParams.get('groupId')
    const limitParam = searchParams.get("limit")
    const limit = limitParam ? parseInt(limitParam) : (groupIdParam ? 1000 : 20)
    const offset = parseInt(searchParams.get("offset") || "0")

    if (!wordSetSlug) {
      return NextResponse.json({ error: "缺少词集参数" }, { status: 400 })
    }

    const wordSet = await prisma.wordSet.findUnique({
      where: { slug: wordSetSlug },
      select: { id: true }
    })

    if (!wordSet) {
      return NextResponse.json({ error: "词集不存在" }, { status: 404 })
    }

    const words = await prisma.word.findMany({
      where: {
        wordSetId: wordSet.id,
        ...(groupIdParam ? { wordGroupId: parseInt(groupIdParam) } : {}),
      },
      select: {
        id: true,
        word: true,
        phoneticUS: true,
        phoneticUK: true,
        definition: true,
        translation: true,
      },
      take: limit,
      skip: offset,
      orderBy: groupIdParam ? { groupIndex: 'asc' } : { index: 'asc' }
    })

    return NextResponse.json({ words, total: words.length })
  } catch (error) {
    console.error("获取单词失败:", error)
    return NextResponse.json({ error: "获取单词失败" }, { status: 500 })
  }
}
