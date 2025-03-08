-- CreateTable
CREATE TABLE "Word" (
    "id" SERIAL NOT NULL,
    "word" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "phonetic" TEXT,
    "translation" TEXT,
    "definition" TEXT,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Word_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpellingRecord" (
    "id" SERIAL NOT NULL,
    "wordId" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "correctCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SpellingRecord_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SpellingRecord" ADD CONSTRAINT "SpellingRecord_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "Word"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
