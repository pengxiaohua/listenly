-- CreateTable
CREATE TABLE "VocabAssessment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "finalVocab" INTEGER NOT NULL,
    "cefrLevel" TEXT NOT NULL,
    "phase2CorrectRate" DOUBLE PRECISION NOT NULL,
    "phase3CorrectRate" DOUBLE PRECISION NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'reading',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VocabAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VocabAssessment_userId_createdAt_idx" ON "VocabAssessment"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "VocabAssessment" ADD CONSTRAINT "VocabAssessment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
