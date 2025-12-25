-- DropIndex
ALTER TABLE "SentenceRecord" DROP CONSTRAINT "SentenceRecord_userId_sentenceId_key";

-- AlterTable
ALTER TABLE "SentenceRecord" ADD COLUMN     "archived" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "SentenceRecord_userId_sentenceId_idx" ON "SentenceRecord"("userId", "sentenceId");

-- CreateIndex
CREATE INDEX "SentenceRecord_userId_createdAt_idx" ON "SentenceRecord"("userId", "createdAt");
