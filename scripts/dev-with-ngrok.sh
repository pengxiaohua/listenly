#!/bin/bash

# 微信登录本地开发脚本
# 使用 ngrok 提供 HTTPS 外网访问以支持微信回调

echo "🚀 启动微信登录本地开发环境..."

# 检查是否安装了 ngrok
if ! command -v ngrok &> /dev/null; then
    echo "❌ 未找到 ngrok，请先安装："
    echo "   npm install -g ngrok"
    echo "   或访问 https://ngrok.com/ 下载"
    exit 1
fi

# 检查环境变量文件
if [ ! -f ".env.local" ]; then
    echo "❌ 未找到 .env.local 文件"
    echo "请创建 .env.local 文件并配置以下变量："
    echo "   WECHAT_APPID=你的微信AppID"
    echo "   WECHAT_SECRET=你的微信AppSecret"
    echo "   NEXTAUTH_URL=http://localhost:3000"
    exit 1
fi

# 启动 Next.js 开发服务器（后台运行）
echo "📦 启动 Next.js 开发服务器..."
npm run dev &
DEV_PID=$!

# 等待开发服务器启动
sleep 5

# 启动 ngrok
echo "🌐 启动 ngrok 内网穿透..."
echo "请将 ngrok 提供的 HTTPS 地址添加到微信开放平台的授权回调域中"
echo "格式：https://xxxxx.ngrok.io"
echo ""
echo "按 Ctrl+C 停止所有服务"

# 捕获 Ctrl+C 信号，清理进程
trap "echo '🛑 停止服务...'; kill $DEV_PID; exit 0" INT

# 启动 ngrok（阻塞运行）
ngrok http 3000

# 如果 ngrok 退出，也停止开发服务器
kill $DEV_PID
