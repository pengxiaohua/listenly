-- AlterTable: 添加 isRead 字段（默认 false）
ALTER TABLE "Feedback" ADD COLUMN IF NOT EXISTS "isRead" BOOLEAN NOT NULL DEFAULT false;

-- 为已有回复的旧数据设置默认值（如果已有回复，默认设为已读，避免误报）
UPDATE "Feedback" SET "isRead" = true WHERE "reply" IS NOT NULL AND "reply" != '';
