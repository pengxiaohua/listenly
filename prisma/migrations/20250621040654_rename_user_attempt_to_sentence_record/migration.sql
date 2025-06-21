/*
  Warnings:

  - You are about to drop the `UserAttempt` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "UserAttempt" DROP CONSTRAINT "UserAttempt_sentenceId_fkey";

-- DropTable
DROP TABLE "UserAttempt";

-- CreateTable
CREATE TABLE "SentenceRecord" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "sentenceId" INTEGER NOT NULL,
    "userInput" TEXT NOT NULL,
    "correct" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SentenceRecord_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SentenceRecord" ADD CONSTRAINT "SentenceRecord_sentenceId_fkey" FOREIGN KEY ("sentenceId") REFERENCES "Sentence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
