# 微信扫码登录配置指南

## 1. 微信开放平台配置

### 1.1 申请网站应用
1. 访问 [微信开放平台](https://open.weixin.qq.com/)
2. 注册并登录开发者账号
3. 创建网站应用，填写应用信息
4. 等待审核通过

### 1.2 获取配置信息
审核通过后，您可以在应用详情页面获取：
- `AppID`：应用的唯一标识
- `AppSecret`：应用密钥

### 1.3 配置授权回调域
在微信开放平台的应用配置中，设置授权回调域：
- 生产环境：`listenly.cn`
- 本地开发：使用ngrok临时地址（如：`38d9-183-94-132-185.ngrok-free.app`）

## 2. 本地调试方案

由于微信开放平台不支持 localhost 作为回调域，本地调试需要以下步骤：

### 方案一：使用 ngrok 内网穿透

#### 2.1 注册 ngrok 账号并获取 authtoken
1. 访问 [ngrok官网](https://ngrok.com/) 注册免费账号
2. 登录后访问 [Dashboard](https://dashboard.ngrok.com/get-started/your-authtoken)
3. 复制你的 authtoken（格式类似：`2abc123def456ghi789_jklmnopqrstuvwxyz123456789`）

#### 2.2 安装并配置 ngrok
1. 安装 ngrok：
   ```bash
   npm install -g ngrok
   ```
   或者从 [ngrok官网](https://ngrok.com/download) 下载对应系统的版本

2. 配置 authtoken：
   ```bash
   ngrok config add-authtoken 你的authtoken
   ```
   例如：
   ```bash
   ngrok config add-authtoken 2abc123def456ghi789_jklmnopqrstuvwxyz123456789
   ```

3. 验证配置：
   ```bash
   ngrok config check
   ```

#### 2.3 启动 ngrok 服务
1. 启动本地服务：`npm run dev`
2. 在新终端运行：`ngrok http 3000`
3. 复制 ngrok 提供的 https 地址（如：`https://38d9-183-94-132-185.ngrok-free.app`）
4. 在微信开放平台添加此域名为授权回调域
5. 更新 `.env.local` 中的 `NEXTAUTH_URL` 为 ngrok 地址

**使用集成脚本（推荐）：**
```bash
npm run dev:wechat
```
此脚本会自动启动开发服务器和 ngrok。

## 3. 环境变量配置

创建 `.env.local` 文件：

```bash
# 微信开放平台配置
WECHAT_APPID="你的微信开放平台AppID"
WECHAT_SECRET="你的微信开放平台AppSecret"

# 应用配置
NEXTAUTH_URL="http://localhost:3000"  # 或者你的 ngrok 地址
```

## 4. 测试流程

1. 启动本地开发服务器：`npm run dev`
2. 访问应用首页
3. 点击登录按钮
4. 切换到"微信扫码"标签
5. 点击"微信登录"按钮
6. 会跳转到微信授权页面，用微信扫码
7. 授权后会自动跳转回应用并完成登录

## 5. 注意事项

- 微信登录需要用户关注公众号或使用微信客户端
- 本地调试建议使用 ngrok，因为微信不支持 localhost
- ngrok 免费版会在每次重启时生成新的URL，需要更新微信配置
- 确保微信开放平台的授权回调域配置正确
- 如果遇到问题，检查浏览器控制台和服务器日志

## 6. 错误排查

### 常见错误及解决方案：

1. **redirect_uri_mismatch**
   - 检查授权回调域配置是否正确
   - 确保 `NEXTAUTH_URL` 环境变量与微信配置一致

2. **invalid_code**
   - 授权码可能已过期或被使用
   - 重新发起授权流程

3. **appid_not_exist**
   - 检查 `WECHAT_APPID` 是否正确
   - 确保应用已审核通过

4. **appsecret_invalid**
   - 检查 `WECHAT_SECRET` 是否正确
   - 确保没有泄露应用密钥

5. **ngrok 相关问题**
   - `command not found: ngrok`：请先安装 ngrok
   - `authtoken not found`：运行 `ngrok config add-authtoken 你的token`
   - `tunnel not found`：检查本地服务是否正常运行在3000端口 
