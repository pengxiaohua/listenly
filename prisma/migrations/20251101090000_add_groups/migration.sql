-- Create enum for group kind
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'GroupKind') THEN
    CREATE TYPE "GroupKind" AS ENUM ('NONE','UNIT','TYPE','SIZE','MANUAL');
  END IF;
END $$;

-- Add optional fields to sets
ALTER TABLE "WordSet" ADD COLUMN IF NOT EXISTS "groupingKind" "GroupKind" NOT NULL DEFAULT 'NONE';
ALTER TABLE "WordSet" ADD COLUMN IF NOT EXISTS "groupSize" INT;
ALTER TABLE "WordSet" ADD COLUMN IF NOT EXISTS "groupNote" TEXT;

ALTER TABLE "SentenceSet" ADD COLUMN IF NOT EXISTS "groupingKind" "GroupKind" NOT NULL DEFAULT 'NONE';
ALTER TABLE "SentenceSet" ADD COLUMN IF NOT EXISTS "groupSize" INT;
ALTER TABLE "SentenceSet" ADD COLUMN IF NOT EXISTS "groupNote" TEXT;

ALTER TABLE "ShadowingSet" ADD COLUMN IF NOT EXISTS "groupingKind" "GroupKind" NOT NULL DEFAULT 'NONE';
ALTER TABLE "ShadowingSet" ADD COLUMN IF NOT EXISTS "groupSize" INT;
ALTER TABLE "ShadowingSet" ADD COLUMN IF NOT EXISTS "groupNote" TEXT;

-- Add optional index & group fields to members
ALTER TABLE "Word" ADD COLUMN IF NOT EXISTS "index" INT;
ALTER TABLE "Word" ADD COLUMN IF NOT EXISTS "wordGroupId" INT;
ALTER TABLE "Word" ADD COLUMN IF NOT EXISTS "groupIndex" INT;

ALTER TABLE "Sentence" ADD COLUMN IF NOT EXISTS "sentenceGroupId" INT;
ALTER TABLE "Sentence" ADD COLUMN IF NOT EXISTS "groupIndex" INT;

ALTER TABLE "Shadowing" ADD COLUMN IF NOT EXISTS "shadowingGroupId" INT;
ALTER TABLE "Shadowing" ADD COLUMN IF NOT EXISTS "groupIndex" INT;

-- Create group tables
CREATE TABLE IF NOT EXISTS "WordGroup" (
  id SERIAL PRIMARY KEY,
  "wordSetId" INT NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  kind "GroupKind" NOT NULL,
  "order" INT NOT NULL,
  description TEXT,
  "coverImage" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_wordgroup_wordset FOREIGN KEY ("wordSetId") REFERENCES "WordSet" (id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT uq_wordgroup_slug UNIQUE ("wordSetId", slug),
  CONSTRAINT uq_wordgroup_order UNIQUE ("wordSetId", "order")
);

CREATE TABLE IF NOT EXISTS "SentenceGroup" (
  id SERIAL PRIMARY KEY,
  "sentenceSetId" INT NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  kind "GroupKind" NOT NULL,
  "order" INT NOT NULL,
  description TEXT,
  "coverImage" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_sentencegroup_sentenceset FOREIGN KEY ("sentenceSetId") REFERENCES "SentenceSet" (id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT uq_sentencegroup_slug UNIQUE ("sentenceSetId", slug),
  CONSTRAINT uq_sentencegroup_order UNIQUE ("sentenceSetId", "order")
);

CREATE TABLE IF NOT EXISTS "ShadowingGroup" (
  id SERIAL PRIMARY KEY,
  "shadowingSetId" INT NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  kind "GroupKind" NOT NULL,
  "order" INT NOT NULL,
  description TEXT,
  "coverImage" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_shadowinggroup_shadowingset FOREIGN KEY ("shadowingSetId") REFERENCES "ShadowingSet" (id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT uq_shadowinggroup_slug UNIQUE ("shadowingSetId", slug),
  CONSTRAINT uq_shadowinggroup_order UNIQUE ("shadowingSetId", "order")
);

-- FKs from members to groups
ALTER TABLE "Word" ADD CONSTRAINT fk_word_group FOREIGN KEY ("wordGroupId") REFERENCES "WordGroup" (id) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Sentence" ADD CONSTRAINT fk_sentence_group FOREIGN KEY ("sentenceGroupId") REFERENCES "SentenceGroup" (id) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Shadowing" ADD CONSTRAINT fk_shadowing_group FOREIGN KEY ("shadowingGroupId") REFERENCES "ShadowingGroup" (id) ON DELETE SET NULL ON UPDATE CASCADE;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_word_set_index ON "Word" ("wordSetId", "index");
CREATE INDEX IF NOT EXISTS idx_word_group_index ON "Word" ("wordGroupId", "groupIndex");
CREATE INDEX IF NOT EXISTS idx_sentence_group_index ON "Sentence" ("sentenceGroupId", "groupIndex");
CREATE INDEX IF NOT EXISTS idx_shadowing_group_index ON "Shadowing" ("shadowingGroupId", "groupIndex");


