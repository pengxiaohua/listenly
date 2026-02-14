-- AlterTable: 添加 config 字段（JSON 类型，可为空）
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "config" JSONB;
