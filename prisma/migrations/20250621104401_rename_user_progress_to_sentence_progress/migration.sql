/*
  Warnings:

  - You are about to drop the `UserProgress` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "UserProgress" DROP CONSTRAINT "UserProgress_corpusId_fkey";

-- DropTable
DROP TABLE "UserProgress";

-- CreateTable
CREATE TABLE "SentenceProgress" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "corpusId" INTEGER NOT NULL,
    "sentenceIndex" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SentenceProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SentenceProgress_userId_corpusId_key" ON "SentenceProgress"("userId", "corpusId");

-- AddForeignKey
ALTER TABLE "SentenceProgress" ADD CONSTRAINT "SentenceProgress_corpusId_fkey" FOREIGN KEY ("corpusId") REFERENCES "Corpus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Rename the table (this will preserve the data)
ALTER TABLE "UserProgress" RENAME TO "SentenceProgress";

-- Rename the constraint
ALTER TABLE "SentenceProgress" RENAME CONSTRAINT "UserProgress_pkey" TO "SentenceProgress_pkey";
ALTER TABLE "SentenceProgress" RENAME CONSTRAINT "UserProgress_corpusId_fkey" TO "SentenceProgress_corpusId_fkey";

-- Rename the unique index
ALTER INDEX "UserProgress_userId_corpusId_key" RENAME TO "SentenceProgress_userId_corpusId_key";
