/*
  Warnings:

  - A unique constraint covering the columns `[ossDir]` on the table `Corpus` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `ossDir` to the `Corpus` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Corpus" ADD COLUMN     "ossDir" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Corpus_ossDir_key" ON "Corpus"("ossDir");
