/*
  Warnings:

  - You are about to drop the column `createdAt` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `phoneticUk` on the `Word` table. All the data in the column will be lost.
  - You are about to drop the column `phoneticUs` on the `Word` table. All the data in the column will be lost.
  - Added the required column `phoneticUK` to the `Word` table without a default value. This is not possible if the table is not empty.
  - Added the required column `phoneticUS` to the `Word` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "User_email_key";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "createdAt",
DROP COLUMN "email",
DROP COLUMN "name",
DROP COLUMN "updatedAt";

-- AlterTable
ALTER TABLE "Word" DROP COLUMN "phoneticUk",
DROP COLUMN "phoneticUs",
ADD COLUMN     "phoneticUK" TEXT NOT NULL,
ADD COLUMN     "phoneticUS" TEXT NOT NULL;
