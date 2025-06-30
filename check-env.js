/* eslint-disable @typescript-eslint/no-require-imports */
// 环境变量检查脚本
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
            // 移除引号
            value = value.replace(/^["']|["']$/g, '');
            process.env[key] = value;
          }
        }
      });

      console.log(`✓ 已加载环境变量文件: ${filePath}`);
      return true;
    } else {
      console.log(`✗ 环境变量文件不存在: ${filePath}`);
      return false;
    }
  } catch (error) {
    console.log(`✗ 加载环境变量文件失败: ${error.message}`);
    return false;
  }
}

// 加载 .env.production 文件
const envFilePath = path.join(process.cwd(), '.env.production');
loadEnvFile(envFilePath);

console.log('=== 环境变量检查 ===');
console.log('NODE_ENV:', process.env.NODE_ENV || '未设置');
console.log('PORT:', process.env.PORT || '未设置');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✓ 已设置' : '✗ 未设置');
console.log('WECHAT_APPID:', process.env.WECHAT_APPID ? '✓ 已设置' : '✗ 未设置');
console.log('WECHAT_SECRET:', process.env.WECHAT_SECRET ? '✓ 已设置' : '✗ 未设置');
console.log('NEXTAUTH_SECRET:', process.env.NEXTAUTH_SECRET ? '✓ 已设置' : '✗ 未设置');
console.log('NEXTAUTH_URL:', process.env.NEXTAUTH_URL || '未设置');
console.log('ALIYUN_ACCESS_KEY_ID:', process.env.ALIYUN_ACCESS_KEY_ID ? '✓ 已设置' : '✗ 未设置');
console.log('OSS_ACCESS_KEY_ID:', process.env.OSS_ACCESS_KEY_ID ? '✓ 已设置' : '✗ 未设置');

if (process.env.DATABASE_URL) {
  const url = process.env.DATABASE_URL;
  console.log('\n=== DATABASE_URL 详情 ===');
  console.log('URL 开头:', url.substring(0, 30) + '...');
  console.log('URL 长度:', url.length);
  console.log('协议检查:');
  console.log('  - postgresql://', url.startsWith('postgresql://') ? '✓' : '✗');
  console.log('  - prisma://', url.startsWith('prisma://') ? '✓' : '✗');

  // 尝试解析 URL
  try {
    const urlObj = new URL(url);
    console.log('URL 解析成功:');
    console.log('  - 协议:', urlObj.protocol);
    console.log('  - 主机:', urlObj.hostname);
    console.log('  - 端口:', urlObj.port || '默认端口');
    console.log('  - 数据库:', urlObj.pathname.substring(1));
  } catch (error) {
    console.log('URL 解析失败:', error.message);
  }
}

console.log('=== 检查完成 ===');
