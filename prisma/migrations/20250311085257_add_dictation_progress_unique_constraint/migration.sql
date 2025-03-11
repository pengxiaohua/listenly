/*
  Warnings:

  - A unique constraint covering the columns `[userId,lrcFile]` on the table `DictationProgress` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "DictationProgress_userId_lrcFile_key" ON "DictationProgress"("userId", "lrcFile");
