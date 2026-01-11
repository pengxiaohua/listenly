-- AlterTable: 添加 type 字段（带默认值）
ALTER TABLE "Feedback" ADD COLUMN IF NOT EXISTS "type" TEXT NOT NULL DEFAULT 'bug';

-- AlterTable: 添加 imageUrl 字段（可空）
ALTER TABLE "Feedback" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;

-- AlterTable: 添加 reply 字段（可空）
ALTER TABLE "Feedback" ADD COLUMN IF NOT EXISTS "reply" TEXT;

-- AlterTable: 添加 replyAt 字段（可空）
ALTER TABLE "Feedback" ADD COLUMN IF NOT EXISTS "replyAt" TIMESTAMP(3);

-- AddForeignKey: 添加 User 和 Feedback 之间的外键关系
-- 注意：如果外键已存在，这个操作会失败，所以使用 DO 块来检查
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'Feedback_userId_fkey'
    ) THEN
        ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- 为旧数据设置默认值（如果 type 为 NULL）
UPDATE "Feedback" SET "type" = 'bug' WHERE "type" IS NULL OR "type" = '';
