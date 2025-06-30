#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// 加载 .env.production 文件
function loadEnvFile() {
  const envPath = path.join(__dirname, '.env.production');

  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
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

    console.log('✓ 环境变量已加载');
    console.log('DATABASE_URL:', process.env.DATABASE_URL ? '已设置' : '未设置');
    console.log('WECHAT_APPID:', process.env.WECHAT_APPID ? '已设置' : '未设置');
  } else {
    console.log('✗ .env.production 文件不存在');
  }
}

// 加载环境变量
loadEnvFile();

// 启动 Next.js
console.log('启动 Next.js 应用...');
const nextProcess = spawn('npx', ['next', 'start'], {
  stdio: 'inherit',
  env: process.env
});

nextProcess.on('exit', (code) => {
  process.exit(code);
});
