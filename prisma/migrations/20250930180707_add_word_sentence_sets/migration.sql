-- Schema migration for WordSet/SentenceSet refactor
-- ⚠️ 请务必先备份数据库，并确认 pgcrypto 扩展已启用

BEGIN;

-- 1. WordSet
CREATE TABLE "WordSet" (
    "id"              SERIAL PRIMARY KEY,
    "uuid"            UUID        NOT NULL DEFAULT gen_random_uuid(),
    "name"            TEXT        NOT NULL,
    "slug"            TEXT        NOT NULL UNIQUE,
    "description"     TEXT,
    "coverImage"      TEXT,
    "isPro"           BOOLEAN     NOT NULL DEFAULT FALSE,
    "catalogFirstId"  INT         NOT NULL,
    "catalogSecondId" INT,
    "catalogThirdId"  INT,
    "ossDir"          TEXT,
    "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "WordSet_catalogFirstId_fkey"  FOREIGN KEY ("catalogFirstId")  REFERENCES catalog_first(id)  ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "WordSet_catalogSecondId_fkey" FOREIGN KEY ("catalogSecondId") REFERENCES catalog_second(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "WordSet_catalogThirdId_fkey"  FOREIGN KEY ("catalogThirdId")  REFERENCES catalog_third(id)  ON DELETE SET NULL ON UPDATE CASCADE
);

WITH default_first AS (
    SELECT id FROM catalog_first WHERE slug = 'default' LIMIT 1
), fallback_first AS (
    SELECT id FROM catalog_first ORDER BY id LIMIT 1
), src AS (
    SELECT DISTINCT category FROM "Word"
)
INSERT INTO "WordSet" ("name", "slug", "catalogFirstId")
SELECT
    category,
    category,
    COALESCE((SELECT id FROM default_first), (SELECT id FROM fallback_first))
FROM src
ON CONFLICT ("slug") DO NOTHING;

ALTER TABLE "Word"
    ADD COLUMN IF NOT EXISTS "wordSetId" INT,
    ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE "Word" w
SET "wordSetId" = ws."id"
FROM "WordSet" ws
WHERE ws."slug" = w.category;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM "Word" WHERE "wordSetId" IS NULL) THEN
        RAISE EXCEPTION '迁移失败：仍存在未匹配词集的单词记录';
    END IF;
END $$;

ALTER TABLE "Word"
    ALTER COLUMN "wordSetId" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "Word_word_wordSetId_key" ON "Word"("word", "wordSetId");

ALTER TABLE "Word"
    ADD CONSTRAINT "Word_wordSetId_fkey" FOREIGN KEY ("wordSetId") REFERENCES "WordSet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Word" DROP COLUMN IF EXISTS category;
ALTER TABLE "Word" DROP COLUMN IF EXISTS "catalogThirdId";
ALTER TABLE "Word" DROP COLUMN IF EXISTS "coverImage";
ALTER TABLE "Word" DROP COLUMN IF EXISTS "isPro";


-- 2. Corpus → SentenceSet
ALTER TABLE "Corpus" RENAME TO "SentenceSet";

ALTER TABLE "SentenceSet"
    ADD COLUMN IF NOT EXISTS "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
    ADD COLUMN IF NOT EXISTS "slug" TEXT,
    ADD COLUMN IF NOT EXISTS "coverImage" TEXT,
    ADD COLUMN IF NOT EXISTS "isPro" BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS "catalogFirstId" INT,
    ADD COLUMN IF NOT EXISTS "catalogSecondId" INT,
    ADD COLUMN IF NOT EXISTS "catalogThirdId" INT,
    ADD COLUMN IF NOT EXISTS "ossDir" TEXT;

WITH default_first AS (
    SELECT id FROM catalog_first WHERE slug = 'default' LIMIT 1
), fallback_first AS (
    SELECT id FROM catalog_first ORDER BY id LIMIT 1
)
UPDATE "SentenceSet"
SET "slug" = LOWER(REGEXP_REPLACE("name", '[^a-zA-Z0-9]+', '-', 'g')),
    "catalogFirstId" = COALESCE("catalogFirstId", (SELECT id FROM default_first), (SELECT id FROM fallback_first));

WITH duplicates AS (
    SELECT "slug"
    FROM "SentenceSet"
    GROUP BY "slug"
    HAVING COUNT(*) > 1 OR "slug" IS NULL OR "slug" = ''
)
UPDATE "SentenceSet"
SET "slug" = CONCAT(COALESCE("slug", 'set'), '-', "id")
WHERE "slug" IS NULL OR "slug" = '' OR "slug" IN (SELECT "slug" FROM duplicates);

ALTER TABLE "SentenceSet"
    ALTER COLUMN "slug" SET NOT NULL,
    ALTER COLUMN "catalogFirstId" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "SentenceSet_slug_key" ON "SentenceSet"("slug");

ALTER TABLE "SentenceSet"
    ADD CONSTRAINT "SentenceSet_catalogFirstId_fkey"  FOREIGN KEY ("catalogFirstId")  REFERENCES catalog_first(id)  ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "SentenceSet_catalogSecondId_fkey" FOREIGN KEY ("catalogSecondId") REFERENCES catalog_second(id) ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT "SentenceSet_catalogThirdId_fkey"  FOREIGN KEY ("catalogThirdId") REFERENCES catalog_third(id) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Sentence"
    RENAME COLUMN "corpusId" TO "sentenceSetId";

ALTER TABLE "Sentence"
    ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS "extraMetadata" JSONB,
    ADD COLUMN IF NOT EXISTS "audioStatus" "AudioStatus" NOT NULL DEFAULT 'PENDING',
    ADD COLUMN IF NOT EXISTS "ossKey" TEXT;

ALTER TABLE "Sentence" DROP COLUMN IF EXISTS "catalogThirdId";
ALTER TABLE "Sentence" DROP COLUMN IF EXISTS "coverImage";
ALTER TABLE "Sentence" DROP COLUMN IF EXISTS "isPro";

CREATE UNIQUE INDEX IF NOT EXISTS "Sentence_index_sentenceSetId_key" ON "Sentence"("index", "sentenceSetId");

ALTER TABLE "Sentence"
    ADD CONSTRAINT "Sentence_sentenceSetId_fkey" FOREIGN KEY ("sentenceSetId") REFERENCES "SentenceSet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- 3. Import & Audio tasks
ALTER TABLE import_jobs
    ADD COLUMN IF NOT EXISTS "wordSetId" INT,
    ADD COLUMN IF NOT EXISTS "sentenceSetId" INT,
    ADD COLUMN IF NOT EXISTS "catalogFirstId" INT,
    ADD COLUMN IF NOT EXISTS "catalogSecondId" INT,
    ADD COLUMN IF NOT EXISTS "catalogThirdId" INT;

ALTER TABLE audio_tasks
    ADD COLUMN IF NOT EXISTS "wordSetId" INT,
    ADD COLUMN IF NOT EXISTS "sentenceSetId" INT,
    ADD COLUMN IF NOT EXISTS "catalogFirstId" INT,
    ADD COLUMN IF NOT EXISTS "catalogSecondId" INT,
    ADD COLUMN IF NOT EXISTS "catalogThirdId" INT;

ALTER TABLE import_jobs
    ADD CONSTRAINT import_jobs_wordSetId_fkey       FOREIGN KEY ("wordSetId")       REFERENCES "WordSet"("id")      ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT import_jobs_sentenceSetId_fkey   FOREIGN KEY ("sentenceSetId")   REFERENCES "SentenceSet"("id")  ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT import_jobs_catalogFirstId_fkey  FOREIGN KEY ("catalogFirstId")  REFERENCES catalog_first(id)  ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT import_jobs_catalogSecondId_fkey FOREIGN KEY ("catalogSecondId") REFERENCES catalog_second(id) ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT import_jobs_catalogThirdId_fkey  FOREIGN KEY ("catalogThirdId")  REFERENCES catalog_third(id)  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE audio_tasks
    ADD CONSTRAINT audio_tasks_wordSetId_fkey       FOREIGN KEY ("wordSetId")       REFERENCES "WordSet"("id")      ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT audio_tasks_sentenceSetId_fkey   FOREIGN KEY ("sentenceSetId")   REFERENCES "SentenceSet"("id")  ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT audio_tasks_catalogFirstId_fkey  FOREIGN KEY ("catalogFirstId")  REFERENCES catalog_first(id)  ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT audio_tasks_catalogSecondId_fkey FOREIGN KEY ("catalogSecondId") REFERENCES catalog_second(id) ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT audio_tasks_catalogThirdId_fkey  FOREIGN KEY ("catalogThirdId")  REFERENCES catalog_third(id)  ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT;
