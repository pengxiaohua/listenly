-- CreateEnum
CREATE TYPE "VideoCategory" AS ENUM ('PSYCHOLOGY', 'PERSONAL_GROWTH', 'CAREER_BUSINESS', 'SCIENCE_TECH', 'HEALTHY_LIVING', 'SPEECH_EXPRESSION', 'PHILOSOPHY_THINKING');

-- CreateTable
CREATE TABLE "Video" (
    "id" SERIAL NOT NULL,
    "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "titleZh" TEXT,
    "author" TEXT,
    "description" TEXT,
    "category" "VideoCategory" NOT NULL,
    "level" TEXT,
    "duration" INTEGER,
    "tags" TEXT[],
    "coverImage" TEXT,
    "videoOssKey" TEXT NOT NULL,
    "subtitles" JSONB,
    "isPro" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Video_pkey" PRIMARY KEY ("id")
);
