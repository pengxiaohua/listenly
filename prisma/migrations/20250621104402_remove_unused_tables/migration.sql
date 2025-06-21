-- 删除外键约束
ALTER TABLE "SentenceProgress" DROP CONSTRAINT IF EXISTS "SentenceProgress_corpusId_fkey";

-- 删除表
DROP TABLE IF EXISTS "DictationProgress";
DROP TABLE IF EXISTS "SentenceProgress";
