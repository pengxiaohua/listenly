-- 为旧反馈数据设置默认值
-- 如果 type 字段为 NULL，设置为 'bug'
UPDATE "Feedback" SET type = 'bug' WHERE type IS NULL;

-- 确保所有反馈都有 type 字段（如果数据库允许 NULL，这个操作可以确保有默认值）
-- 注意：如果 type 字段已经有 NOT NULL 约束，上面的 UPDATE 可能不需要
