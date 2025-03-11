-- CreateTable
CREATE TABLE "DictationProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lrcFile" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "attempts" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DictationProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DictationProgress_userId_idx" ON "DictationProgress"("userId");
