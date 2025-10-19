-- 将下划线命名的表重命名为大驼峰
BEGIN;

-- 重命名 catalog 表
ALTER TABLE catalog_first RENAME TO "CatalogFirst";
ALTER TABLE catalog_second RENAME TO "CatalogSecond";
ALTER TABLE catalog_third RENAME TO "CatalogThird";

-- 重命名 import/audio 表
ALTER TABLE import_jobs RENAME TO "ImportJob";
ALTER TABLE import_job_items RENAME TO "ImportJobItem";
ALTER TABLE audio_tasks RENAME TO "AudioTask";

COMMIT;

