-- AlterTable
ALTER TABLE "SentenceGroup" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ShadowingGroup" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "WordGroup" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- RenameForeignKey
ALTER TABLE "Sentence" RENAME CONSTRAINT "fk_sentence_group" TO "Sentence_sentenceGroupId_fkey";

-- RenameForeignKey
ALTER TABLE "SentenceGroup" RENAME CONSTRAINT "fk_sentencegroup_sentenceset" TO "SentenceGroup_sentenceSetId_fkey";

-- RenameForeignKey
ALTER TABLE "Shadowing" RENAME CONSTRAINT "fk_shadowing_group" TO "Shadowing_shadowingGroupId_fkey";

-- RenameForeignKey
ALTER TABLE "ShadowingGroup" RENAME CONSTRAINT "fk_shadowinggroup_shadowingset" TO "ShadowingGroup_shadowingSetId_fkey";

-- RenameForeignKey
ALTER TABLE "Word" RENAME CONSTRAINT "fk_word_group" TO "Word_wordGroupId_fkey";

-- RenameForeignKey
ALTER TABLE "WordGroup" RENAME CONSTRAINT "fk_wordgroup_wordset" TO "WordGroup_wordSetId_fkey";

-- RenameIndex
ALTER INDEX "idx_sentence_group_index" RENAME TO "Sentence_sentenceGroupId_groupIndex_idx";

-- RenameIndex
ALTER INDEX "uq_sentencegroup_order" RENAME TO "SentenceGroup_sentenceSetId_order_key";

-- RenameIndex
ALTER INDEX "uq_sentencegroup_slug" RENAME TO "SentenceGroup_sentenceSetId_slug_key";

-- RenameIndex
ALTER INDEX "idx_shadowing_group_index" RENAME TO "Shadowing_shadowingGroupId_groupIndex_idx";

-- RenameIndex
ALTER INDEX "uq_shadowinggroup_order" RENAME TO "ShadowingGroup_shadowingSetId_order_key";

-- RenameIndex
ALTER INDEX "uq_shadowinggroup_slug" RENAME TO "ShadowingGroup_shadowingSetId_slug_key";

-- RenameIndex
ALTER INDEX "idx_word_group_index" RENAME TO "Word_wordGroupId_groupIndex_idx";

-- RenameIndex
ALTER INDEX "idx_word_set_index" RENAME TO "Word_wordSetId_index_idx";

-- RenameIndex
ALTER INDEX "uq_wordgroup_order" RENAME TO "WordGroup_wordSetId_order_key";

-- RenameIndex
ALTER INDEX "uq_wordgroup_slug" RENAME TO "WordGroup_wordSetId_slug_key";
