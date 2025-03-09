/*
  Warnings:

  - You are about to drop the column `phonetic` on the `Word` table. All the data in the column will be lost.
  - Added the required column `phoneticUk` to the `Word` table without a default value. This is not possible if the table is not empty.
  - Added the required column `phoneticUs` to the `Word` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Word" DROP COLUMN "phonetic",
ADD COLUMN     "phoneticUk" TEXT NOT NULL,
ADD COLUMN     "phoneticUs" TEXT NOT NULL;
