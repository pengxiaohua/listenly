#!/bin/bash

# 进入项目目录
cd /var/www/listenly

# 加载环境变量
export $(cat .env.production | grep -v '^#' | xargs)

# 调试：打印关键环境变量（仅显示是否设置）
echo "=== 启动脚本调试信息 ==="
echo "NODE_ENV: $NODE_ENV"
echo "DATABASE_URL: $(if [ -n "$DATABASE_URL" ]; then echo "已设置"; else echo "未设置"; fi)"
echo "WECHAT_APPID: $(if [ -n "$WECHAT_APPID" ]; then echo "已设置"; else echo "未设置"; fi)"
echo "=========================="

# 启动应用
exec pnpm start
