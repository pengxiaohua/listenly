-- DropIndex
ALTER TABLE "WordRecord" DROP CONSTRAINT IF EXISTS "WordRecord_userId_wordId_key";
DROP INDEX IF EXISTS "WordRecord_userId_wordId_key";

-- AlterTable
ALTER TABLE "WordRecord" ADD COLUMN "archived" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "WordRecord_userId_wordId_idx" ON "WordRecord"("userId", "wordId");

-- CreateIndex
CREATE INDEX "WordRecord_userId_createdAt_idx" ON "WordRecord"("userId", "createdAt");

