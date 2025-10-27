-- Rename correct to isCorrect and drop userInput in SentenceRecord table
BEGIN;

-- Drop userInput column
ALTER TABLE "SentenceRecord" DROP COLUMN IF EXISTS "userInput";

-- Rename correct to isCorrect
ALTER TABLE "SentenceRecord" RENAME COLUMN "correct" TO "isCorrect";

COMMIT;

