-- 为 WordSet、SentenceSet、ShadowingSet 添加 level 字段
ALTER TABLE "WordSet" ADD COLUMN IF NOT EXISTS "level" TEXT;
ALTER TABLE "SentenceSet" ADD COLUMN IF NOT EXISTS "level" TEXT;
ALTER TABLE "ShadowingSet" ADD COLUMN IF NOT EXISTS "level" TEXT;
