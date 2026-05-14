-- CreateTable
CREATE TABLE "VideoRecord" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "videoId" INTEGER NOT NULL,
    "playedSeconds" INTEGER NOT NULL DEFAULT 0,
    "activeSeconds" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VideoRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VideoRecord_userId_createdAt_idx" ON "VideoRecord"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "VideoRecord_userId_videoId_updatedAt_idx" ON "VideoRecord"("userId", "videoId", "updatedAt");
