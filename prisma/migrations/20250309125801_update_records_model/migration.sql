/*
  Warnings:

  - A unique constraint covering the columns `[user_id,word_id,category]` on the table `records` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[category,word]` on the table `words` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `category` to the `records` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "records" ADD COLUMN     "category" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "records_user_id_word_id_category_key" ON "records"("user_id", "word_id", "category");

-- CreateIndex
CREATE UNIQUE INDEX "words_category_word_key" ON "words"("category", "word");
