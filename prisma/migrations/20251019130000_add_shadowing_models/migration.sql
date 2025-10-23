-- Add ShadowingSet / Shadowing / ShadowingRecord and link to ImportJob & AudioTask
BEGIN;

-- ensure uuid generator available
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Tables
CREATE TABLE IF NOT EXISTS "ShadowingSet" (
  "id"              SERIAL PRIMARY KEY,
  "name"            TEXT NOT NULL,
  "ossDir"          TEXT NOT NULL,
  "description"     TEXT,
  "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "uuid"            UUID NOT NULL DEFAULT gen_random_uuid(),
  "slug"            TEXT NOT NULL,
  "coverImage"      TEXT,
  "isPro"           BOOLEAN NOT NULL DEFAULT FALSE,
  "catalogFirstId"  INT NOT NULL,
  "catalogSecondId" INT,
  "catalogThirdId"  INT
);

CREATE UNIQUE INDEX IF NOT EXISTS "ShadowingSet_name_key"   ON "ShadowingSet" ("name");
CREATE UNIQUE INDEX IF NOT EXISTS "ShadowingSet_ossDir_key" ON "ShadowingSet" ("ossDir");
CREATE UNIQUE INDEX IF NOT EXISTS "ShadowingSet_slug_key"   ON "ShadowingSet" ("slug");

ALTER TABLE "ShadowingSet"
  ADD CONSTRAINT "ShadowingSet_catalogFirstId_fkey"
  FOREIGN KEY ("catalogFirstId") REFERENCES "CatalogFirst"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ShadowingSet"
  ADD CONSTRAINT "ShadowingSet_catalogSecondId_fkey"
  FOREIGN KEY ("catalogSecondId") REFERENCES "CatalogSecond"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ShadowingSet"
  ADD CONSTRAINT "ShadowingSet_catalogThirdId_fkey"
  FOREIGN KEY ("catalogThirdId") REFERENCES "CatalogThird"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "Shadowing" (
  "id"               SERIAL PRIMARY KEY,
  "shadowingSetId"   INT NOT NULL,
  "index"            INT NOT NULL,
  "text"             TEXT NOT NULL,
  "translation"      TEXT,
  "audioStatus"      "AudioStatus" NOT NULL DEFAULT 'PENDING',
  "extraMetadata"    JSONB,
  "ossKey"           TEXT,
  "createdAt"        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS "Shadowing_index_shadowingSetId_key"
  ON "Shadowing" ("index", "shadowingSetId");

ALTER TABLE "Shadowing"
  ADD CONSTRAINT "Shadowing_shadowingSetId_fkey"
  FOREIGN KEY ("shadowingSetId") REFERENCES "ShadowingSet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "ShadowingRecord" (
  "id"           SERIAL PRIMARY KEY,
  "userId"       TEXT NOT NULL,
  "shadowingId"  INT NOT NULL,
  "recognized"   TEXT,
  "score"        INT,
  "rawResult"    JSONB,
  "audioOssKey"  TEXT,
  "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE "ShadowingRecord"
  ADD CONSTRAINT "ShadowingRecord_shadowingId_fkey"
  FOREIGN KEY ("shadowingId") REFERENCES "Shadowing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 2) Link optional foreign keys from ImportJob & AudioTask to ShadowingSet
ALTER TABLE "ImportJob"
  ADD COLUMN IF NOT EXISTS "shadowingSetId" INT;

ALTER TABLE "ImportJob"
  ADD CONSTRAINT "import_jobs_shadowingSetId_fkey"
  FOREIGN KEY ("shadowingSetId") REFERENCES "ShadowingSet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AudioTask"
  ADD COLUMN IF NOT EXISTS "shadowingSetId" INT;

ALTER TABLE "AudioTask"
  ADD CONSTRAINT "audio_tasks_shadowingSetId_fkey"
  FOREIGN KEY ("shadowingSetId") REFERENCES "ShadowingSet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT;


