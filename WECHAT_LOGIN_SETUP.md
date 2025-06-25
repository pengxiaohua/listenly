# 微信扫码登录 - 快速设置指南

## 📋 功能概述

已为您的应用添加了微信扫码登录功能，用户现在可以选择：
1. **手机验证码登录**（原有功能）
2. **微信扫码登录**（新功能）

## 🚀 快速开始

### 1. 配置环境变量

创建 `.env.local` 文件并添加：

```bash
# 微信开放平台配置
WECHAT_APPID="你的微信开放平台AppID"
WECHAT_SECRET="你的微信开放平台AppSecret"
```

### 2. 本地调试（推荐使用ngrok）

#### 2.1 ngrok 注册和配置
1. **注册 ngrok 账号**：
   - 访问 [ngrok官网](https://ngrok.com/) 注册免费账号
   - 登录后访问 [Dashboard](https://dashboard.ngrok.com/get-started/your-authtoken)
   - 复制你的 authtoken

2. **安装 ngrok**：
   ```bash
   # 方式一：通过 npm 安装
   npm install -g ngrok
   
   # 方式二：从官网下载
   # https://ngrok.com/download
   ```

3. **配置 authtoken**：
   ```bash
   ngrok config add-authtoken 你的authtoken
   ```
   例如：
   ```bash
   ngrok config add-authtoken 2abc123def456ghi789_jklmnopqrstuvwxyz123456789
   ```

4. **验证配置**：
   ```bash
   ngrok config check
   ```

5. **env.local配置**
  # ngrok url 配置
  ```bash
  # 本地开发,使用 ngrok 动态地址，和微信开放平台配置保持一致
  NEXTAUTH_URL="https://dc72-43-224-64-246.ngrok-free.app"
  
  # 生产环境
  # NEXTAUTH_URL="https://listenly.cn"
  ```

#### 2.2 启动开发环境

**方式一：使用集成脚本（推荐）**
```bash
npm run dev:wechat
```

**方式二：手动启动**
```bash
# 终端1：启动开发服务器
npm run dev

# 终端2：启动 ngrok
ngrok http 3000
```

### 3. 微信开放平台配置

1. 访问 [微信开放平台](https://open.weixin.qq.com/)
2. 在你的网站应用中设置**授权回调域**：
   - 本地调试：复制ngrok提供的域名（如：`38d9-183-94-132-185.ngrok-free.app`）
   - 生产环境：`listenly.cn`

**注意：** ngrok 免费版每次重启会生成新的URL，需要重新配置微信回调域。

## 🔧 已实现的功能

### 新增API路由
- `GET /api/auth/wechat/login` - 获取微信授权链接
- `GET /api/auth/wechat/callback` - 微信授权回调处理

### 组件更新
- `LoginDialog` 已更新为标签页切换模式
- 支持手机验证码和微信扫码两种登录方式

### 数据库支持
- `User` 模型已包含 `wechatOpenId` 字段
- 支持微信用户信息自动同步

## 🔄 登录流程

### 微信登录流程：
1. 用户点击"微信登录"
2. 跳转到微信授权页面
3. 用户使用微信扫码确认授权
4. 微信回调到 `/api/auth/wechat/callback`
5. 获取用户信息并创建/更新用户记录
6. 设置登录状态并重定向到首页

## 🐛 常见问题

### Q1: 本地调试时提示 `redirect_uri_mismatch`
**解决方案：**
- 确保微信开放平台的授权回调域与 `NEXTAUTH_URL` 一致
- 使用 ngrok 或修改 hosts 文件

### Q2: 获取用户信息失败
**解决方案：**
- 检查 `WECHAT_APPID` 和 `WECHAT_SECRET` 是否正确
- 确保微信应用已审核通过

### Q3: ngrok 相关问题
**解决方案：**
- `command not found: ngrok`：请先安装 ngrok
- `authtoken not found`：运行 `ngrok config add-authtoken 你的token`
- `tunnel not found`：检查本地服务是否正常运行在3000端口
- 新的URL需要重新配置微信回调域

### Q4: 本地无法访问微信服务
**解决方案：**
- 使用 `npm run dev:wechat` 启动 ngrok
- 或手动配置内网穿透工具

## 📁 文件结构

```
app/api/auth/wechat/
├── login/route.ts          # 微信登录入口
└── callback/route.ts       # 微信授权回调

components/auth/
└── LoginDialog.tsx         # 更新的登录对话框

lib/
└── wechat.ts              # 微信API工具函数

scripts/
└── dev-with-ngrok.sh      # 本地开发脚本
```

## 🎯 下一步

1. 注册 ngrok 账号并配置 authtoken
2. 配置环境变量
3. 在微信开放平台设置回调域
4. 运行 `npm run dev:wechat` 开始调试
5. 测试登录流程

