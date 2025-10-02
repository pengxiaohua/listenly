-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('WORD', 'SENTENCE');

-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ImportItemStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "AudioTaskStatus" AS ENUM ('PENDING', 'PROCESSING', 'DONE', 'FAILED');

-- CreateEnum
CREATE TYPE "AudioStatus" AS ENUM ('PENDING', 'READY', 'FAILED');

-- AlterTable
ALTER TABLE "Sentence" ADD COLUMN     "audioStatus" "AudioStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "catalogThirdId" INTEGER,
ADD COLUMN     "coverImage" TEXT,
ADD COLUMN     "extraMetadata" JSONB,
ADD COLUMN     "isPro" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ossKey" TEXT;

-- AlterTable
ALTER TABLE "Word" ADD COLUMN     "audioStatus" "AudioStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "catalogThirdId" INTEGER,
ADD COLUMN     "coverImage" TEXT,
ADD COLUMN     "extraMetadata" JSONB,
ADD COLUMN     "isPro" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ossKey" TEXT;

-- CreateTable
CREATE TABLE "catalog_first" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catalog_first_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_second" (
    "id" SERIAL NOT NULL,
    "firstId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catalog_second_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_third" (
    "id" SERIAL NOT NULL,
    "secondId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catalog_third_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_jobs" (
    "id" TEXT NOT NULL,
    "type" "ContentType" NOT NULL,
    "catalogThirdId" INTEGER,
    "isPro" BOOLEAN NOT NULL DEFAULT false,
    "sourceFile" TEXT,
    "totalCount" INTEGER NOT NULL DEFAULT 0,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "status" "ImportStatus" NOT NULL DEFAULT 'PENDING',
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "import_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_job_items" (
    "id" SERIAL NOT NULL,
    "jobId" TEXT NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "ImportItemStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "import_job_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audio_tasks" (
    "id" TEXT NOT NULL,
    "type" "ContentType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "salt" TEXT,
    "ossKey" TEXT,
    "status" "AudioTaskStatus" NOT NULL DEFAULT 'PENDING',
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "catalogThirdId" INTEGER,

    CONSTRAINT "audio_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "catalog_first_slug_key" ON "catalog_first"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "catalog_second_slug_key" ON "catalog_second"("slug");

-- CreateIndex
CREATE INDEX "catalog_second_firstId_idx" ON "catalog_second"("firstId");

-- CreateIndex
CREATE UNIQUE INDEX "catalog_third_slug_key" ON "catalog_third"("slug");

-- CreateIndex
CREATE INDEX "catalog_third_secondId_idx" ON "catalog_third"("secondId");

-- CreateIndex
CREATE INDEX "import_job_items_jobId_idx" ON "import_job_items"("jobId");

-- CreateIndex
CREATE INDEX "audio_tasks_status_idx" ON "audio_tasks"("status");

-- AddForeignKey
ALTER TABLE "Word" ADD CONSTRAINT "Word_catalogThirdId_fkey" FOREIGN KEY ("catalogThirdId") REFERENCES "catalog_third"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sentence" ADD CONSTRAINT "Sentence_catalogThirdId_fkey" FOREIGN KEY ("catalogThirdId") REFERENCES "catalog_third"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_second" ADD CONSTRAINT "catalog_second_firstId_fkey" FOREIGN KEY ("firstId") REFERENCES "catalog_first"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_third" ADD CONSTRAINT "catalog_third_secondId_fkey" FOREIGN KEY ("secondId") REFERENCES "catalog_second"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_jobs" ADD CONSTRAINT "import_jobs_catalogThirdId_fkey" FOREIGN KEY ("catalogThirdId") REFERENCES "catalog_third"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_job_items" ADD CONSTRAINT "import_job_items_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "import_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audio_tasks" ADD CONSTRAINT "audio_tasks_catalogThirdId_fkey" FOREIGN KEY ("catalogThirdId") REFERENCES "catalog_third"("id") ON DELETE SET NULL ON UPDATE CASCADE;
