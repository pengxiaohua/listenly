
import { prisma } from './lib/prisma';

async function test() {
  try {
    // 模拟一个用户ID，或者不传userId查所有
    // 这里我们只是测试 distinct 和 orderBy 的组合是否报错
    // 由于我们不知道真实 userId，我们先尝试查一条存在的记录获取 userId
    const one = await prisma.sentenceRecord.findFirst();
    if (!one) {
      console.log('No records found');
      return;
    }
    const userId = one.userId;
    console.log('Testing with userId:', userId);

    const records = await prisma.sentenceRecord.findMany({
      distinct: ['sentenceId'],
      where: {
        userId: userId,
        errorCount: { gt: 0 },
        isMastered: false,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    });
    
    console.log('Records found:', records.length);
    records.forEach(r => {
        console.log(`ID: ${r.id}, SentenceID: ${r.sentenceId}, CreatedAt: ${r.createdAt}`);
    });

  } catch (e) {
    console.error('Error:', e);
  } finally {
    await prisma.$disconnect();
  }
}

test();
