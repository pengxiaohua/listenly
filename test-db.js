/* eslint-disable @typescript-eslint/no-require-imports */
// 数据库连接测试脚本
const fs = require('fs');
const path = require('path');

// 手动加载 .env.production 文件
function loadEnvFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      const envContent = fs.readFileSync(filePath, 'utf8');
      const lines = envContent.split('\n');

      lines.forEach(line => {
        line = line.trim();
        if (line && !line.startsWith('#')) {
          const [key, ...valueParts] = line.split('=');
          if (key && valueParts.length > 0) {
            let value = valueParts.join('=');
            value = value.replace(/^["']|["']$/g, '');
            process.env[key] = value;
          }
        }
      });

      console.log(`✓ 已加载环境变量文件: ${filePath}`);
      return true;
    }
  } catch (error) {
    console.log(`✗ 加载环境变量文件失败: ${error.message}`);
    return false;
  }
}

// 加载环境变量
const envFilePath = path.join(process.cwd(), '.env.production');
loadEnvFile(envFilePath);

console.log('=== 数据库连接测试 ===');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? '已设置' : '未设置');

if (!process.env.DATABASE_URL) {
  console.log('❌ DATABASE_URL 未设置');
  process.exit(1);
}

async function testDatabaseConnection() {
  try {
    console.log('\n1. 测试 Prisma 客户端创建...');
    const { PrismaClient } = require('@prisma/client');

    const prisma = new PrismaClient({
      log: ['query', 'info', 'warn', 'error'],
    });

    console.log('✓ Prisma 客户端创建成功');

    console.log('\n2. 测试数据库连接...');
    await prisma.$connect();
    console.log('✓ 数据库连接成功');

    console.log('\n3. 测试查询操作...');
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✓ 查询测试成功:', result);

    console.log('\n4. 测试用户表查询...');
    const userCount = await prisma.user.count();
    console.log('✓ 用户表查询成功，用户数量:', userCount);

    await prisma.$disconnect();
    console.log('\n✅ 所有数据库测试通过');

  } catch (error) {
    console.log('\n❌ 数据库连接测试失败:');
    console.log('错误类型:', error.constructor.name);
    console.log('错误代码:', error.code);
    console.log('错误消息:', error.message);

    if (error.meta) {
      console.log('错误详情:', error.meta);
    }

    process.exit(1);
  }
}

testDatabaseConnection();
