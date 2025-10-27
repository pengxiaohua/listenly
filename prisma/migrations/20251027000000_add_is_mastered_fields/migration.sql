-- Add isMastered field to WordRecord, SentenceRecord, and Vocabulary tables
BEGIN;

-- Add isMastered to WordRecord
ALTER TABLE "WordRecord" ADD COLUMN IF NOT EXISTS "isMastered" BOOLEAN NOT NULL DEFAULT FALSE;

-- Add isMastered to SentenceRecord
ALTER TABLE "SentenceRecord" ADD COLUMN IF NOT EXISTS "isMastered" BOOLEAN NOT NULL DEFAULT FALSE;

-- Add isMastered to Vocabulary
ALTER TABLE "Vocabulary" ADD COLUMN IF NOT EXISTS "isMastered" BOOLEAN NOT NULL DEFAULT FALSE;

COMMIT;

