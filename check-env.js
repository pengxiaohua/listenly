// 环境变量检查脚本
console.log('=== 环境变量检查 ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);
console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✓ 已设置' : '✗ 未设置');
console.log('WECHAT_APPID:', process.env.WECHAT_APPID ? '✓ 已设置' : '✗ 未设置');
console.log('WECHAT_SECRET:', process.env.WECHAT_SECRET ? '✓ 已设置' : '✗ 未设置');
console.log('NEXTAUTH_SECRET:', process.env.NEXTAUTH_SECRET ? '✓ 已设置' : '✗ 未设置');
console.log('NEXTAUTH_URL:', process.env.NEXTAUTH_URL || '未设置');

if (process.env.DATABASE_URL) {
  const url = process.env.DATABASE_URL;
  console.log('\n=== DATABASE_URL 详情 ===');
  console.log('URL 开头:', url.substring(0, 30) + '...');
  console.log('URL 长度:', url.length);
  console.log('协议检查:');
  console.log('  - postgresql://', url.startsWith('postgresql://') ? '✓' : '✗');
  console.log('  - prisma://', url.startsWith('prisma://') ? '✓' : '✗');
}

console.log('=== 检查完成 ===');
