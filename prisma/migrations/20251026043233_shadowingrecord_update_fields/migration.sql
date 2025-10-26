/*
  Warnings:

  - You are about to drop the column `recognized` on the `ShadowingRecord` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "ContentType" ADD VALUE 'SHADOWING';

-- AlterTable
ALTER TABLE "ShadowingRecord" DROP COLUMN "recognized",
ADD COLUMN     "ossUrl" TEXT,
ADD COLUMN     "shadowingSentence" TEXT,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ShadowingSet" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- RenameForeignKey
ALTER TABLE "AudioTask" RENAME CONSTRAINT "audio_tasks_shadowingSetId_fkey" TO "AudioTask_shadowingSetId_fkey";

-- RenameForeignKey
ALTER TABLE "ImportJob" RENAME CONSTRAINT "import_jobs_shadowingSetId_fkey" TO "ImportJob_shadowingSetId_fkey";
