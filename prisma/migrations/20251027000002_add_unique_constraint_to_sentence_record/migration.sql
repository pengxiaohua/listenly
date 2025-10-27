-- Add unique constraint to SentenceRecord table
BEGIN;

-- First, remove duplicate records, keeping only the most recent one for each userId + sentenceId combination
DELETE FROM "SentenceRecord" a USING (
  SELECT MIN(id) as id, "userId", "sentenceId"
  FROM "SentenceRecord"
  GROUP BY "userId", "sentenceId" HAVING COUNT(*) > 1
) b
WHERE a."userId" = b."userId"
  AND a."sentenceId" = b."sentenceId"
  AND a.id <> b.id;

-- Add unique constraint
ALTER TABLE "SentenceRecord" ADD CONSTRAINT "SentenceRecord_userId_sentenceId_key" UNIQUE ("userId", "sentenceId");

COMMIT;

