#!/bin/bash

# 进入项目目录
cd /var/www/listenly

# 加载环境变量
export $(cat .env.production | grep -v '^#' | xargs)

# 启动应用
exec pnpm start
