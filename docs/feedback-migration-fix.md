# 反馈功能数据库迁移修复指南

## 问题描述
在部署反馈功能更新时，如果忘记先执行数据库迁移，可能会导致接口返回 500 错误。本文档提供修复步骤。

## 修复步骤

### 1. 连接到服务器并进入项目目录
```bash
cd /path/to/listenly
```

### 2. 执行数据库迁移
```bash
# 生成 Prisma Client
npx prisma generate

# 执行数据库迁移（生产环境）
npx prisma migrate deploy

# 或者如果 migrate deploy 失败，使用 db push（仅开发环境，生产环境谨慎使用）
# npx prisma db push
```

### 3. 修复旧数据（可选但推荐）
如果数据库中有旧的反馈记录，需要为它们设置默认值：

```sql
-- 连接到 PostgreSQL 数据库后执行
UPDATE "Feedback" SET type = 'bug' WHERE type IS NULL;
```

或者使用 psql 命令行：
```bash
psql -U your_username -d your_database -c "UPDATE \"Feedback\" SET type = 'bug' WHERE type IS NULL;"
```

### 4. 重新构建和重启应用
```bash
# 重新构建
pnpm run build

# 重启应用（根据你的部署方式选择）
pm2 reload listenly
# 或者
pm2 restart listenly
```

## 验证修复

### 检查 API 是否正常
```bash
# 测试获取反馈列表（需要管理员权限）
curl -H "Cookie: userId=your_user_id" https://listenly.cn/api/feedback?page=1&pageSize=20

# 或者在前端测试
# 访问：https://listenly.cn/api/feedback?page=1&pageSize=20
```

### 检查数据库结构
```bash
# 使用 Prisma Studio 查看数据库（可选）
npx prisma studio
```

## 常见问题

### 1. 迁移失败：字段已存在
如果遇到 "column already exists" 错误，说明迁移已经部分执行。可以：
- 检查数据库当前状态
- 手动执行缺失的迁移步骤
- 或者使用 `prisma db push`（仅开发环境）

### 2. 500 错误仍然存在
检查以下几点：
1. **查看服务器日志**：
   ```bash
   pm2 logs listenly
   # 或
   tail -f logs/combined-*.log
   ```

2. **检查环境变量**：确保 OSS 相关环境变量已正确配置
   ```bash
   echo $OSS_REGION
   echo $OSS_ACCESS_KEY_ID
   echo $OSS_BUCKET_NAME
   ```

3. **检查数据库连接**：确保 DATABASE_URL 环境变量正确

4. **检查 Prisma Client**：确保已执行 `npx prisma generate`

### 3. 旧数据兼容性问题
代码已经做了兼容处理：
- `type` 字段如果为 NULL，会自动设置为 'bug'
- `imageUrl`、`reply`、`replyAt` 字段如果为 NULL，会返回 null
- `user` 关联如果不存在，会返回 null

如果仍有问题，可以手动更新旧数据：
```sql
-- 为所有旧反馈设置默认类型
UPDATE "Feedback" SET type = 'bug' WHERE type IS NULL OR type = '';

-- 检查是否有数据问题
SELECT id, type, "imageUrl", reply FROM "Feedback" LIMIT 10;
```

## 预防措施

### 推荐的部署流程
1. **拉取代码**：`git pull`
2. **安装依赖**：`pnpm install`（如果有新依赖）
3. **生成 Prisma Client**：`npx prisma generate`
4. **执行数据库迁移**：`npx prisma migrate deploy`
5. **构建应用**：`pnpm run build`
6. **重启服务**：`pm2 reload listenly`

### 使用部署脚本（推荐）
可以创建一个部署脚本 `scripts/deploy.sh`：
```bash
#!/bin/bash
set -e

echo "开始部署..."

# 拉取代码
git pull

# 安装依赖
pnpm install

# 生成 Prisma Client
npx prisma generate

# 执行数据库迁移
npx prisma migrate deploy

# 构建应用
pnpm run build

# 重启服务
pm2 reload listenly

echo "部署完成！"
```

然后每次部署只需执行：
```bash
bash scripts/deploy.sh
```
