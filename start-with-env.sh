#!/bin/bash

# 进入项目目录
cd /var/www/listenly

echo "=== 启动脚本开始 ==="
echo "当前目录: $(pwd)"
echo "检查 .env.production 文件..."

if [ -f ".env.production" ]; then
    echo "✓ .env.production 文件存在"

    # 加载环境变量
    set -a  # 自动导出所有变量
    source .env.production
    set +a  # 关闭自动导出

    echo "=== 环境变量加载完成 ==="
    echo "NODE_ENV: ${NODE_ENV:-未设置}"
    echo "DATABASE_URL: $(if [ -n "$DATABASE_URL" ]; then echo "已设置 (长度: ${#DATABASE_URL})"; else echo "未设置"; fi)"
    echo "WECHAT_APPID: $(if [ -n "$WECHAT_APPID" ]; then echo "已设置"; else echo "未设置"; fi)"
    echo "WECHAT_SECRET: $(if [ -n "$WECHAT_SECRET" ]; then echo "已设置"; else echo "未设置"; fi)"
    echo "=========================="
else
    echo "✗ .env.production 文件不存在"
    exit 1
fi

echo "启动 Next.js 应用..."

# 启动应用
exec pnpm start
