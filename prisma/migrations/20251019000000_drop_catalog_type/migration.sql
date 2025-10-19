BEGIN;

-- 移除目录表中的 type 列
ALTER TABLE "CatalogFirst"  DROP COLUMN IF EXISTS type;
ALTER TABLE "CatalogSecond" DROP COLUMN IF EXISTS type;
ALTER TABLE "CatalogThird"  DROP COLUMN IF EXISTS type;

COMMIT;


