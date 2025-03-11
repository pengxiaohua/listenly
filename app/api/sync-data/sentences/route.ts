import { NextResponse } from 'next/server'
import { PrismaClient } from "@prisma/client"
import fs from 'fs/promises'
import path from 'path'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const prisma = globalForPrisma.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export async function POST() {
  try {
    // 读取 public/lrc 目录下的所有 lrc 文件
    const lrcDir = path.join(process.cwd(), 'public', 'lrcs')
    const files = await fs.readdir(lrcDir)
    const lrcFiles = files.filter(file => file.endsWith('.lrc'))

    let totalFiles = 0
    const totalRecords = 0

    // 为每个 lrc 文件创建初始进度记录
    for (const lrcFile of lrcFiles) {
      await prisma.dictationProgress.upsert({
        where: {
          userId_lrcFile: {
            userId: 'hua',
            lrcFile: lrcFile
          }
        },
        update: {}, // 如果记录存在，不做更新
        create: {
          userId: 'hua',
          lrcFile: lrcFile,
          position: 0,
          attempts: []
        }
      })
      totalFiles++
    }

    return NextResponse.json({
      success: true, 
      message: `成功同步 ${totalFiles} 个文件的句子数据，共 ${totalRecords} 条记录`,
      data: {
        totalFiles,
        totalRecords
      }
    })
  } catch (error) {
    console.error('Sync sentences error:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: '同步句子数据失败',
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}