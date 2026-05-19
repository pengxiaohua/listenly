-- 插入 id=50 的占位记录（软删除状态），后续在后台管理中编辑补充真实内容
INSERT INTO "Video" (id, title, category, "videoOssKey", status, "createdAt", "updatedAt")
VALUES (50, '占位-待编辑', 'LANGUAGE_LEARNING', 'placeholder', 'DELETED', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
